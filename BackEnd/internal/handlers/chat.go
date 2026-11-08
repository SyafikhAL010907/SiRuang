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
			cr.user_identifier, 
			COALESCE(cr.last_message, ''), 
			cr.updated_at, 
			COALESCE(NULLIF(p.full_name, ''), a.username, cr.user_identifier),
			(SELECT COUNT(*) FROM chat_messages WHERE room_id = cr.id AND is_read = 0 AND sender_identifier = cr.user_identifier) as unread_count,
			EXISTS(SELECT 1 FROM active_sessions WHERE identifier = cr.user_identifier) as is_online,
			cr.is_marked_unread,
			COALESCE(p.avatar_url, '') as avatar_url,
			COALESCE(a.role::text, 'user') as role
		FROM chat_rooms cr
		LEFT JOIN authentication a ON cr.user_identifier = a.identifier
		LEFT JOIN profiles p ON a.id = p.user_id
		ORDER BY cr.updated_at DESC`)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal ambil daftar room: " + err.Error()})
		return
	}
	defer rows.Close()

	var rooms []models.ChatRoom
	for rows.Next() {
		var room models.ChatRoom
		if err := rows.Scan(&room.ID, &room.UserIdentifier, &room.LastMessage, &room.UpdatedAt, &room.UserName, &room.UnreadCount, &room.IsOnline, &room.IsMarkedUnread, &room.AvatarURL, &room.Role); err != nil {
			log.Println("[ERROR] Scan room:", err)
			continue
		}
		rooms = append(rooms, room)
	}

	c.JSON(http.StatusOK, rooms)
}

// GetOrCreateRoom - User fetches their personal room
func GetOrCreateRoom(c *gin.Context) {
	userIdentifier := c.Query("identifier")
	if userIdentifier == "" {
		// Fallback cek "gmail" untuk backward compatibility jika frontend belum ter-refresh
		userIdentifier = c.Query("gmail")
	}
	if userIdentifier == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Identifier (NIM/NIP) tidak boleh kosong"})
		return
	}

	var room models.ChatRoom
	err := database.DB.QueryRow(`
		SELECT id, user_identifier, COALESCE(last_message, ''), updated_at,
		(SELECT COUNT(*) FROM chat_messages WHERE room_id = chat_rooms.id AND sender_identifier != chat_rooms.user_identifier AND is_read = 0) as unread_count,
		is_marked_unread
		FROM chat_rooms WHERE user_identifier = $1`, userIdentifier).
		Scan(&room.ID, &room.UserIdentifier, &room.LastMessage, &room.UpdatedAt, &room.UnreadCount, &room.IsMarkedUnread)

	if err == sql.ErrNoRows {
		fmt.Printf("[INFO] Creating new room for: %s\n", userIdentifier)
		// PostgreSQL: gunakan RETURNING id
		errInsert := database.DB.QueryRow(
			"INSERT INTO chat_rooms (user_identifier) VALUES ($1) RETURNING id",
			userIdentifier,
		).Scan(&room.ID)
		if errInsert != nil {
			fmt.Printf("[ERROR] CreateRoom: %v\n", errInsert)
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat room chat: " + errInsert.Error()})
			return
		}
		room.UserIdentifier = userIdentifier
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
	rows, err := database.DB.Query(
		"SELECT id, room_id, sender_identifier, message, message_type, is_read, created_at FROM chat_messages WHERE room_id = $1 ORDER BY created_at ASC",
		roomID,
	)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil history chat"})
		return
	}
	defer rows.Close()

	messages := []models.ChatMessage{}
	for rows.Next() {
		var msg models.ChatMessage
		if err := rows.Scan(&msg.ID, &msg.RoomID, &msg.SenderIdentifier, &msg.Message, &msg.MessageType, &msg.IsRead, &msg.CreatedAt); err != nil {
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

	trimmedMsg := strings.TrimSpace(msg.Message)
	if strings.HasPrefix(trimmedMsg, "{\"files\"") || strings.HasPrefix(trimmedMsg, "{\"files\":") {
		msg.MessageType = "multi_file"
	}
	if msg.MessageType == "" {
		msg.MessageType = "text"
	}

	// 1. Simpan pesan ke DB dengan RETURNING id
	err := database.DB.QueryRow(
		"INSERT INTO chat_messages (room_id, sender_identifier, message, message_type) VALUES ($1, $2, $3, $4) RETURNING id",
		msg.RoomID, msg.SenderIdentifier, msg.Message, msg.MessageType,
	).Scan(&msg.ID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyimpan pesan: " + err.Error()})
		return
	}

	// 2. Update last_message dan updated_at di chat_rooms
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
	_, _ = database.DB.Exec("UPDATE chat_rooms SET last_message = $1, updated_at = NOW() WHERE id = $2", lastMsg, msg.RoomID)

	c.JSON(http.StatusOK, msg)
}

// MarkAsRead - Reset unread count for a room
func MarkAsRead(c *gin.Context) {
	roomID := c.Param("room_id")
	if roomID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Room ID wajib diisi"})
		return
	}

	identifierRaw, exists := c.Get("identifier")
	if !exists {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized"})
		return
	}
	identifier := fmt.Sprintf("%v", identifierRaw)

	_, err := database.DB.Exec("UPDATE chat_messages SET is_read = 1 WHERE room_id = $1 AND sender_identifier != $2", roomID, identifier)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal update status baca: " + err.Error()})
		return
	}

	database.DB.Exec("UPDATE chat_rooms SET is_marked_unread = FALSE WHERE id = $1", roomID)

	c.JSON(http.StatusOK, gin.H{"message": "Status baca berhasil diperbarui"})
}

// MarkAsUnread - Admin marks a room as unread
func MarkAsUnread(c *gin.Context) {
	roomID := c.Param("room_id")
	if roomID == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Room ID wajib diisi"})
		return
	}

	_, err := database.DB.Exec("UPDATE chat_rooms SET is_marked_unread = TRUE WHERE id = $1", roomID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menandai belum dibaca: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Berhasil ditandai belum dibaca"})
}

// GetAllUsers - Admin fetches all registered users
func GetAllUsers(c *gin.Context) {
	rows, err := database.DB.Query("SELECT username, identifier FROM authentication WHERE role != 'admin' ORDER BY username ASC")
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil daftar user"})
		return
	}
	defer rows.Close()

	var users []map[string]string
	for rows.Next() {
		var username, identifier string
		if err := rows.Scan(&username, &identifier); err != nil {
			continue
		}
		users = append(users, map[string]string{
			"username":   username,
			"identifier": identifier,
			"gmail":      identifier, // fallback alias
		})
	}

	c.JSON(http.StatusOK, users)
}

// BroadcastMessage - Send a message to users based on target type
func BroadcastMessage(c *gin.Context) {
	var req struct {
		Message           string   `json:"message"`
		AdminIdentifier   string   `json:"admin_identifier"`
		AdminGmail        string   `json:"admin_gmail"` // Fallback alias
		MessageType       string   `json:"message_type"`
		FileData          string   `json:"file_data"`
		FileType          string   `json:"file_type"`
		TargetType        string   `json:"target_type"` // 'waiting_room', 'all_users', 'specific_users'
		TargetIdentifiers []string `json:"target_identifiers"`
		TargetGmails      []string `json:"target_gmails"` // Fallback alias
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data pesan tidak valid"})
		return
	}

	adminID := req.AdminIdentifier
	if adminID == "" {
		adminID = req.AdminGmail
	}

	if req.MessageType == "" {
		req.MessageType = "text"
	}
	if req.TargetType == "" {
		req.TargetType = "waiting_room"
	}

	var targetIdentifiers []string

	switch req.TargetType {
	case "waiting_room":
		rows, err := database.DB.Query("SELECT user_identifier FROM chat_rooms")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil daftar room"})
			return
		}
		defer rows.Close()
		for rows.Next() {
			var id string
			rows.Scan(&id)
			targetIdentifiers = append(targetIdentifiers, id)
		}
	case "all_users":
		rows, err := database.DB.Query("SELECT identifier FROM authentication WHERE role != 'admin'")
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil daftar user"})
			return
		}
		defer rows.Close()
		for rows.Next() {
			var id string
			rows.Scan(&id)
			targetIdentifiers = append(targetIdentifiers, id)
		}
	case "specific_users":
		targetIdentifiers = req.TargetIdentifiers
		if len(targetIdentifiers) == 0 {
			targetIdentifiers = req.TargetGmails
		}
	}

	if len(targetIdentifiers) == 0 {
		c.JSON(http.StatusOK, gin.H{"message": "Tidak ada target user untuk dikirimi pesan"})
		return
	}

	tx, err := database.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memulai transaksi"})
		return
	}

	for _, idUser := range targetIdentifiers {
		var roomID int
		err := tx.QueryRow("SELECT id FROM chat_rooms WHERE user_identifier = $1", idUser).Scan(&roomID)
		if err == sql.ErrNoRows {
			errInsert := tx.QueryRow("INSERT INTO chat_rooms (user_identifier) VALUES ($1) RETURNING id", idUser).Scan(&roomID)
			if errInsert != nil {
				continue
			}
		} else if err != nil {
			continue
		}

		if req.FileData != "" && req.Message != "" {
			mergedMessage := req.FileData + "|" + req.Message
			_, err = tx.Exec("INSERT INTO chat_messages (room_id, sender_identifier, message, message_type) VALUES ($1, $2, $3, $4)",
				roomID, adminID, mergedMessage, req.FileType)
			if err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengirim pesan"})
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
			_, _ = tx.Exec("UPDATE chat_rooms SET last_message = $1, updated_at = NOW() WHERE id = $2", lastMsg, roomID)

		} else if req.FileData != "" {
			_, err = tx.Exec("INSERT INTO chat_messages (room_id, sender_identifier, message, message_type) VALUES ($1, $2, $3, $4)",
				roomID, adminID, req.FileData, req.FileType)
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
			_, _ = tx.Exec("UPDATE chat_rooms SET last_message = $1, updated_at = NOW() WHERE id = $2", lastMsg, roomID)

		} else if req.Message != "" {
			_, err = tx.Exec("INSERT INTO chat_messages (room_id, sender_identifier, message, message_type) VALUES ($1, $2, $3, $4)",
				roomID, adminID, req.Message, "text")
			if err != nil {
				tx.Rollback()
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengirim pesan teks"})
				return
			}
			_, _ = tx.Exec("UPDATE chat_rooms SET last_message = $1, updated_at = NOW() WHERE id = $2", req.Message, roomID)
		}
	}

	if err := tx.Commit(); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menyelesaikan transaksi"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": fmt.Sprintf("Berhasil mengirim pesan ke %d user!", len(targetIdentifiers))})
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
		_, err = tx.Exec("DELETE FROM chat_messages WHERE room_id = $1", rid)
		if err != nil {
			tx.Rollback()
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal menghapus pesan room"})
			return
		}

		_, err = tx.Exec("DELETE FROM chat_rooms WHERE id = $1", rid)
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
