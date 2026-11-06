package handlers

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"helpdesk-backend/internal/database"
	"helpdesk-backend/internal/models"
	"log"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
)

// GetRooms - Admin fetches all chat rooms
func GetRooms(c *gin.Context) {
	rows, err := database.DB.Query(`
		SELECT 
			cr.id, 
			cr.user_gmail, 
			COALESCE(cr.last_message, ''), 
			cr.updated_at, 
			COALESCE(a.username, ''),
			(SELECT COUNT(*) FROM chat_messages WHERE room_id = cr.id AND is_read = 0 AND sender_gmail = cr.user_gmail) as unread_count,
			EXISTS(SELECT 1 FROM active_sessions WHERE gmail = cr.user_gmail) as is_online,
			cr.is_marked_unread
		FROM chat_rooms cr
		LEFT JOIN authentication a ON cr.user_gmail = a.gmail
		ORDER BY cr.updated_at DESC`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal ambil daftar room: " + err.Error()})
		return
	}
	defer rows.Close()

	var rooms []models.ChatRoom
	for rows.Next() {
		var room models.ChatRoom
		if err := rows.Scan(&room.ID, &room.UserGmail, &room.LastMessage, &room.UpdatedAt, &room.UserName, &room.UnreadCount, &room.IsOnline, &room.IsMarkedUnread); err != nil {
			log.Println("[ERROR] Scan room:", err)
			continue
		}
		rooms = append(rooms, room)
	}

	c.JSON(http.StatusOK, rooms)
}

// GetOrCreateRoom - User fetches their personal room
func GetOrCreateRoom(c *gin.Context) {
	userGmail := c.Query("gmail")
	if userGmail == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Gmail tidak boleh kosong"})
		return
	}

	var room models.ChatRoom
	err := database.DB.QueryRow(`
		SELECT id, user_gmail, COALESCE(last_message, ''), updated_at,
		(SELECT COUNT(*) FROM chat_messages WHERE room_id = chat_rooms.id AND sender_gmail != chat_rooms.user_gmail AND is_read = 0) as unread_count,
		is_marked_unread
		FROM chat_rooms WHERE user_gmail = ?`, userGmail).
		Scan(&room.ID, &room.UserGmail, &room.LastMessage, &room.UpdatedAt, &room.UnreadCount, &room.IsMarkedUnread)

	if err == sql.ErrNoRows {
		fmt.Printf("[INFO] Creating new room for: %s\n", userGmail)
		// Buat room baru kalau belum ada
		result, err := database.DB.Exec("INSERT INTO chat_rooms (user_gmail) VALUES (?)", userGmail)
		if err != nil {
			fmt.Printf("[ERROR] CreateRoom: %v\n", err)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat room chat: " + err.Error()})
			return
		}
		id, _ := result.LastInsertId()
		room.ID = int(id)
		room.UserGmail = userGmail
	} else if err != nil {
		fmt.Printf("[ERROR] GetOrCreateRoom: %v\n", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mencari room: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, room)
}

// GetMessages - Fetch messages for a specific room
func GetMessages(c *gin.Context) {
	roomID := c.Param("room_id")
	rows, err := database.DB.Query("SELECT id, room_id, sender_gmail, message, message_type, is_read, created_at FROM chat_messages WHERE room_id = ? ORDER BY created_at ASC", roomID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil history chat"})
		return
	}
	defer rows.Close()

	messages := []models.ChatMessage{}
	for rows.Next() {
		var msg models.ChatMessage
		if err := rows.Scan(&msg.ID, &msg.RoomID, &msg.SenderGmail, &msg.Message, &msg.MessageType, &msg.IsRead, &msg.CreatedAt); err != nil {
			continue
		}
		messages = append(messages, msg)
	}

	c.JSON(http.StatusOK, messages)
}

// SendMessage - Post a new message
func SendMessage(c *gin.Context) {
	var msg models.ChatMessage
	if err := c.ShouldBindJSON(&msg); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data pesan tidak valid"})
		return
	}

	// Jika pesan diawali {"files", otomatis deteksi sebagai multi_file
	trimmedMsg := strings.TrimSpace(msg.Message)
	if strings.HasPrefix(trimmedMsg, "{\"files\"") || strings.HasPrefix(trimmedMsg, "{\"files\":") {
		msg.MessageType = "multi_file"
	}

	// 1. Simpan pesan ke DB
	result, err := database.DB.Exec("INSERT INTO chat_messages (room_id, sender_gmail, message, message_type) VALUES (?, ?, ?, ?)",
		msg.RoomID, msg.SenderGmail, msg.Message, msg.MessageType)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan pesan"})
		return
	}

	// 2. Update last_message dan updated_at di chat_rooms biar naik ke atas (kayak WA)
	lastMsg := msg.Message
	switch msg.MessageType {
	case "image":
		if strings.Contains(msg.Message, "|") {
			parts := strings.Split(msg.Message, "|")
			if len(parts) > 2 && strings.TrimSpace(parts[2]) != "" {
				lastMsg = "🖼️ " + strings.TrimSpace(parts[2])
			} else {
				lastMsg = "🖼️ " + parts[0]
			}
		} else {
			lastMsg = "🖼️ Gambar"
		}
	case "file":
		if strings.Contains(msg.Message, "|") {
			parts := strings.Split(msg.Message, "|")
			if len(parts) > 2 && strings.TrimSpace(parts[2]) != "" {
				lastMsg = "📄 " + strings.TrimSpace(parts[2])
			} else {
				lastMsg = "📄 " + parts[0]
			}
		} else {
			lastMsg = "📄 Dokumen"
		}
	case "multi_file":
		if strings.HasPrefix(strings.TrimSpace(msg.Message), "{") {
			var payload struct {
				Files []struct {
					Name string `json:"name"`
				} `json:"files"`
				Caption string `json:"caption"`
			}
			if err := json.Unmarshal([]byte(msg.Message), &payload); err == nil && len(payload.Files) > 0 {
				if strings.TrimSpace(payload.Caption) != "" {
					lastMsg = fmt.Sprintf("📎 %d File: %s", len(payload.Files), strings.TrimSpace(payload.Caption))
				} else {
					lastMsg = fmt.Sprintf("📎 %d Lampiran File", len(payload.Files))
				}
			} else {
				lastMsg = "📎 Lampiran File"
			}
		} else {
			lastMsg = "📎 Lampiran File"
		}
	}
	_, _ = database.DB.Exec("UPDATE chat_rooms SET last_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", lastMsg, msg.RoomID)

	id, _ := result.LastInsertId()
	msg.ID = int(id)
	
	c.JSON(http.StatusOK, msg)
}

// MarkAsRead - Reset unread count for a room
func MarkAsRead(c *gin.Context) {
	roomID := c.Param("room_id")
	if roomID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Room ID wajib diisi"})
		return
	}

	gmailRaw, exists := c.Get("gmail")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	gmail := fmt.Sprintf("%v", gmailRaw)

	_, err := database.DB.Exec("UPDATE chat_messages SET is_read = 1 WHERE room_id = ? AND sender_gmail != ?", roomID, gmail)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal update status baca: " + err.Error()})
		return
	}

	// Also clear the is_marked_unread flag
	database.DB.Exec("UPDATE chat_rooms SET is_marked_unread = 0 WHERE id = ?", roomID)

	c.JSON(http.StatusOK, gin.H{"message": "Status baca berhasil diperbarui"})
}

// MarkAsUnread - Admin marks a room as unread
func MarkAsUnread(c *gin.Context) {
	roomID := c.Param("room_id")
	if roomID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Room ID wajib diisi"})
		return
	}

	_, err := database.DB.Exec("UPDATE chat_rooms SET is_marked_unread = 1 WHERE id = ?", roomID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menandai belum dibaca: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Berhasil ditandai belum dibaca"})
}

// GetAllUsers - Admin fetches all registered users
func GetAllUsers(c *gin.Context) {
	rows, err := database.DB.Query("SELECT username, gmail FROM authentication WHERE role != 'admin' ORDER BY username ASC")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil daftar user"})
		return
	}
	defer rows.Close()

	var users []map[string]string
	for rows.Next() {
		var username, gmail string
		if err := rows.Scan(&username, &gmail); err != nil {
			continue
		}
		users = append(users, map[string]string{
			"username": username,
			"gmail":    gmail,
		})
	}

	c.JSON(http.StatusOK, users)
}

// BroadcastMessage - Send a message to users based on target type
func BroadcastMessage(c *gin.Context) {
	var req struct {
		Message      string   `json:"message"`
		AdminGmail   string   `json:"admin_gmail"`
		MessageType  string   `json:"message_type"`
		FileData     string   `json:"file_data"`
		FileType     string   `json:"file_type"`
		TargetType   string   `json:"target_type"`   // 'waiting_room', 'all_users', 'specific_users'
		TargetGmails []string `json:"target_gmails"` // used if target_type is 'specific_users'
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data pesan tidak valid"})
		return
	}

	if req.MessageType == "" {
		req.MessageType = "text"
	}
	if req.TargetType == "" {
		req.TargetType = "waiting_room" // default behavior
	}

	var targetGmails []string

	switch req.TargetType {
	case "waiting_room":
		// Get gmails from active chat_rooms
		rows, err := database.DB.Query("SELECT user_gmail FROM chat_rooms")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil daftar room"})
			return
		}
		defer rows.Close()
		for rows.Next() {
			var gmail string
			rows.Scan(&gmail)
			targetGmails = append(targetGmails, gmail)
		}
	case "all_users":
		// Get all registered gmails excluding admin
		rows, err := database.DB.Query("SELECT gmail FROM authentication WHERE role != 'admin'")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil daftar user"})
			return
		}
		defer rows.Close()
		for rows.Next() {
			var gmail string
			rows.Scan(&gmail)
			targetGmails = append(targetGmails, gmail)
		}
	case "specific_users":
		targetGmails = req.TargetGmails
	}

	if len(targetGmails) == 0 {
		c.JSON(http.StatusOK, gin.H{"message": "Tidak ada target user untuk dikirimi pesan"})
		return
	}

	// 2. Kirim pesan (Pakai Transaction biar aman)
	tx, err := database.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memulai transaksi"})
		return
	}

	for _, gmail := range targetGmails {
		// Pastikan room ada atau buat baru
		var roomID int
		err := tx.QueryRow("SELECT id FROM chat_rooms WHERE user_gmail = ?", gmail).Scan(&roomID)
		if err == sql.ErrNoRows {
			// Buat room baru
			res, errInsert := tx.Exec("INSERT INTO chat_rooms (user_gmail) VALUES (?)", gmail)
			if errInsert != nil {
				continue // skip if failed to create room
			}
			id, _ := res.LastInsertId()
			roomID = int(id)
		} else if err != nil {
			continue // other error
		}

		// LOGIK MERGED (Nempel Jadi Satu): Jika ada File DAN Teks
		if req.FileData != "" && req.Message != "" {
			mergedMessage := req.FileData + "|" + req.Message
			_, err = tx.Exec("INSERT INTO chat_messages (room_id, sender_gmail, message, message_type) VALUES (?, ?, ?, ?)",
				roomID, req.AdminGmail, mergedMessage, req.FileType)
			if err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengirim pesan Bless Chat terpadu"})
				return
			}

			// Update room info
			lastMsg := "🖼️ Gambar"
			if req.FileType == "file" {
				lastMsg = "📄 Dokumen"
			}
			if strings.Contains(req.FileData, "|") {
				parts := strings.Split(req.FileData, "|")
				lastMsg = parts[0]
			}
			_, _ = tx.Exec("UPDATE chat_rooms SET last_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", lastMsg, roomID)

		} else if req.FileData != "" {
			// HANYA FILE
			_, err = tx.Exec("INSERT INTO chat_messages (room_id, sender_gmail, message, message_type) VALUES (?, ?, ?, ?)",
				roomID, req.AdminGmail, req.FileData, req.FileType)
			if err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengirim file"})
				return
			}

			lastMsg := "🖼️ Gambar"
			if req.FileType == "file" {
				lastMsg = "📄 Dokumen"
			}
			if strings.Contains(req.FileData, "|") {
				parts := strings.Split(req.FileData, "|")
				lastMsg = parts[0]
			}
			_, _ = tx.Exec("UPDATE chat_rooms SET last_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", lastMsg, roomID)

		} else if req.Message != "" {
			// HANYA TEKS
			_, err = tx.Exec("INSERT INTO chat_messages (room_id, sender_gmail, message, message_type) VALUES (?, ?, ?, ?)",
				roomID, req.AdminGmail, req.Message, "text")
			if err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengirim pesan teks"})
				return
			}
			_, _ = tx.Exec("UPDATE chat_rooms SET last_message = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?", req.Message, roomID)
		}
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyelesaikan transaksi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": fmt.Sprintf("Berhasil mengirim pesan ke %d user!", len(targetGmails))})
}

// BulkDeleteRooms - Delete multiple chat rooms and their messages
func BulkDeleteRooms(c *gin.Context) {
	var req struct {
		RoomIDs []int `json:"room_ids"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data room ID tidak valid"})
		return
	}

	if len(req.RoomIDs) == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Pilih minimal satu room untuk dihapus"})
		return
	}

	tx, err := database.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memulai transaksi"})
		return
	}

	for _, rid := range req.RoomIDs {
		// 1. Hapus pesan di dalam room
		_, err = tx.Exec("DELETE FROM chat_messages WHERE room_id = ?", rid)
		if err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus pesan room"})
			return
		}

		// 2. Hapus room
		_, err = tx.Exec("DELETE FROM chat_rooms WHERE id = ?", rid)
		if err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus room"})
			return
		}
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyelesaikan transaksi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": fmt.Sprintf("Berhasil menghapus %d room chat!", len(req.RoomIDs))})
}
