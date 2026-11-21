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
	"sync"

	"github.com/gin-gonic/gin"
)

var (
	hasChatColumnsChecked bool
	hasChatColumns        bool
	hasChatColumnsMu      sync.RWMutex
)

// HasChatColumns mendeteksi ketersediaan kolom SQL-2 Blok D di chat_rooms
func HasChatColumns() bool {
	hasChatColumnsMu.RLock()
	if hasChatColumnsChecked && hasChatColumns {
		hasChatColumnsMu.RUnlock()
		return true
	}
	hasChatColumnsMu.RUnlock()

	hasChatColumnsMu.Lock()
	defer hasChatColumnsMu.Unlock()
	if hasChatColumnsChecked && hasChatColumns {
		return true
	}

	if database.DB == nil {
		return false
	}

	var exists bool
	err := database.DB.QueryRow(`
		SELECT EXISTS (
			SELECT 1 
			FROM information_schema.columns 
			WHERE table_name = 'chat_rooms' 
			  AND column_name = 'participant_b_identifier'
		)
	`).Scan(&exists)
	if err == nil {
		hasChatColumns = exists
		hasChatColumnsChecked = true
	}
	return hasChatColumns
}

func isAdminDev(role string) bool {
	return role == "admin" || role == "admin_dev"
}

func isBuildingAdmin(role string) bool {
	return role == "admin_sfd" || role == "admin_le" || role == "admin_ls"
}

func isAnyAdmin(role string) bool {
	return isAdminDev(role) || isBuildingAdmin(role)
}

// GetRooms - Admin fetches all chat rooms
func GetRooms(c *gin.Context) {
	roleRaw, _ := c.Get("role")
	callerRole, _ := roleRaw.(string)
	identifierRaw, _ := c.Get("identifier")
	callerID, _ := identifierRaw.(string)

	hasNewCols := HasChatColumns()

	if isBuildingAdmin(callerRole) {
		// Admin gedung (sfd/le/ls): melihat room ke Admin Dev + room ke semua akun PJ (pj_kelas)
		// Room admin gedung lain TIDAK terlihat olehnya
		if !hasNewCols {
			c.JSON(http.StatusOK, []models.ChatRoom{})
			return
		}

		// 1. Ambil identifier Admin Dev
		var adminDevID string
		_ = database.DB.QueryRow("SELECT identifier FROM authentication WHERE role::text IN ('admin', 'admin_dev') ORDER BY id ASC LIMIT 1").Scan(&adminDevID)
		if adminDevID != "" {
			var existDevRoom bool
			_ = database.DB.QueryRow(`
				SELECT EXISTS(
					SELECT 1 FROM chat_rooms 
					WHERE (user_identifier = $1 AND participant_b_identifier = $2)
					   OR (user_identifier = $2 AND participant_b_identifier = $1)
				)`, callerID, adminDevID).Scan(&existDevRoom)
			if !existDevRoom {
				_, _ = database.DB.Exec(`
					INSERT INTO chat_rooms (user_identifier, room_type, participant_b_identifier, participant_b_role)
					VALUES ($1, 'user_to_admin', $2, 'admin')
					ON CONFLICT DO NOTHING`, callerID, adminDevID)
			}
		}

		// 2. Ambil semua akun dengan role 'pj_kelas' dan pastikan room ada
		pjRows, errPj := database.DB.Query("SELECT identifier FROM authentication WHERE role = 'pj_kelas'")
		if errPj == nil {
			defer pjRows.Close()
			for pjRows.Next() {
				var pjID string
				if err := pjRows.Scan(&pjID); err == nil && pjID != "" {
					var existPjRoom bool
					_ = database.DB.QueryRow(`
						SELECT EXISTS(
							SELECT 1 FROM chat_rooms 
							WHERE user_identifier = $1 AND participant_b_identifier = $2
						)`, pjID, callerID).Scan(&existPjRoom)
					if !existPjRoom {
						_, _ = database.DB.Exec(`
							INSERT INTO chat_rooms (user_identifier, room_type, participant_b_identifier, participant_b_role)
							VALUES ($1, 'user_to_admin', $2, $3)
							ON CONFLICT DO NOTHING`, pjID, callerID, callerRole)
					}
				}
			}
		}

		// 3. Query semua room yang melibatkan Admin Gedung ini (dan Admin Dev)
		rows, err := database.DB.Query(`
			SELECT 
				cr.id, 
				CASE WHEN cr.user_identifier = $1 THEN cr.participant_b_identifier ELSE cr.user_identifier END as partner_identifier,
				COALESCE(cr.room_type, 'user_to_admin'),
				COALESCE(cr.participant_b_identifier, ''),
				COALESCE(cr.participant_b_role, ''),
				COALESCE(cr.last_message, ''), 
				COALESCE(cr.updated_at, (SELECT MAX(created_at) FROM chat_messages WHERE room_id = cr.id), '1970-01-01'::timestamp) as updated_at, 
				COALESCE(NULLIF(p.full_name, ''), a.username, cr.user_identifier),
				(SELECT COUNT(*) FROM chat_messages WHERE room_id = cr.id AND is_read = 0 AND sender_identifier != $1) as unread_count,
				EXISTS(SELECT 1 FROM active_sessions WHERE identifier = (CASE WHEN cr.user_identifier = $1 THEN cr.participant_b_identifier ELSE cr.user_identifier END)) as is_online,
				cr.is_marked_unread,
				COALESCE(p.avatar_url, '') as avatar_url,
				COALESCE(a.role::text, 'user') as role
			FROM chat_rooms cr
			LEFT JOIN authentication a ON (CASE WHEN cr.user_identifier = $1 THEN cr.participant_b_identifier ELSE cr.user_identifier END) = a.identifier
			LEFT JOIN profiles p ON a.id = p.user_id
			WHERE cr.participant_b_identifier = $1 
			   OR (cr.user_identifier = $1 AND cr.participant_b_identifier = $2)
			ORDER BY COALESCE(cr.updated_at, (SELECT MAX(created_at) FROM chat_messages WHERE room_id = cr.id), '1970-01-01'::timestamp) DESC, cr.id DESC`,
			callerID, adminDevID,
		)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal ambil daftar room: " + err.Error()})
			return
		}
		defer rows.Close()

		var rooms []models.ChatRoom
		for rows.Next() {
			var room models.ChatRoom
			if err := rows.Scan(
				&room.ID, &room.UserIdentifier, &room.RoomType, &room.ParticipantBIdentifier, &room.ParticipantBRole,
				&room.LastMessage, &room.UpdatedAt, &room.UserName, &room.UnreadCount, &room.IsOnline, &room.IsMarkedUnread,
				&room.AvatarURL, &room.Role,
			); err != nil {
				log.Println("[ERROR] Scan room admin gedung:", err)
				continue
			}

			// Filter: jangan tampilkan room admin gedung lain
			if room.Role == "admin_sfd" || room.Role == "admin_le" || room.Role == "admin_ls" {
				continue
			}

			if room.AvatarURL == "" && (room.Role == "admin" || room.Role == "admin_dev") {
				room.AvatarURL = "/LogoSiRuangPolos.png"
			}

			rooms = append(rooms, room)
		}
		if rooms == nil {
			rooms = []models.ChatRoom{}
		}
		c.JSON(http.StatusOK, rooms)
		return
	}

	// AdminDev / Admin lama: melihat semua room (termasuk room lama yang participant_b NULL)
	if hasNewCols {
		rows, err := database.DB.Query(`
			SELECT 
				cr.id, 
				cr.user_identifier, 
				COALESCE(cr.room_type, 'user_to_admin'),
				COALESCE(cr.participant_b_identifier, ''),
				COALESCE(cr.participant_b_role, ''),
				COALESCE(cr.last_message, ''), 
				COALESCE(cr.updated_at, (SELECT MAX(created_at) FROM chat_messages WHERE room_id = cr.id), '1970-01-01'::timestamp) as updated_at, 
				COALESCE(NULLIF(p.full_name, ''), a.username, cr.user_identifier),
				(SELECT COUNT(*) FROM chat_messages WHERE room_id = cr.id AND is_read = 0 AND sender_identifier = cr.user_identifier) as unread_count,
				EXISTS(SELECT 1 FROM active_sessions WHERE identifier = cr.user_identifier) as is_online,
				cr.is_marked_unread,
				COALESCE(p.avatar_url, '') as avatar_url,
				COALESCE(a.role::text, 'user') as role
			FROM chat_rooms cr
			LEFT JOIN authentication a ON cr.user_identifier = a.identifier
			LEFT JOIN profiles p ON a.id = p.user_id
			ORDER BY COALESCE(cr.updated_at, (SELECT MAX(created_at) FROM chat_messages WHERE room_id = cr.id), '1970-01-01'::timestamp) DESC, cr.id DESC`)
		if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal ambil daftar room: " + err.Error()})
			return
		}
		defer rows.Close()

		var rooms []models.ChatRoom
		for rows.Next() {
			var room models.ChatRoom
			if err := rows.Scan(
				&room.ID, &room.UserIdentifier, &room.RoomType, &room.ParticipantBIdentifier, &room.ParticipantBRole,
				&room.LastMessage, &room.UpdatedAt, &room.UserName, &room.UnreadCount, &room.IsOnline, &room.IsMarkedUnread,
				&room.AvatarURL, &room.Role,
			); err != nil {
				log.Println("[ERROR] Scan room admin dev:", err)
				continue
			}
			rooms = append(rooms, room)
		}
		if rooms == nil {
			rooms = []models.ChatRoom{}
		}
		c.JSON(http.StatusOK, rooms)
		return
	}

	// Fallback lama (kolom baru belum ada di database)
	rows, err := database.DB.Query(`
		SELECT 
			cr.id, 
			cr.user_identifier, 
			COALESCE(cr.last_message, ''), 
			COALESCE(cr.updated_at, (SELECT MAX(created_at) FROM chat_messages WHERE room_id = cr.id), '1970-01-01'::timestamp) as updated_at, 
			COALESCE(NULLIF(p.full_name, ''), a.username, cr.user_identifier),
			(SELECT COUNT(*) FROM chat_messages WHERE room_id = cr.id AND is_read = 0 AND sender_identifier = cr.user_identifier) as unread_count,
			EXISTS(SELECT 1 FROM active_sessions WHERE identifier = cr.user_identifier) as is_online,
			cr.is_marked_unread,
			COALESCE(p.avatar_url, '') as avatar_url,
			COALESCE(a.role::text, 'user') as role
		FROM chat_rooms cr
		LEFT JOIN authentication a ON cr.user_identifier = a.identifier
		LEFT JOIN profiles p ON a.id = p.user_id
		ORDER BY COALESCE(cr.updated_at, (SELECT MAX(created_at) FROM chat_messages WHERE room_id = cr.id), '1970-01-01'::timestamp) DESC, cr.id DESC`)
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
	if rooms == nil {
		rooms = []models.ChatRoom{}
	}

	c.JSON(http.StatusOK, rooms)
}

// GetOrCreateRoom - User fetches their personal room (mendukung target admin bila kolom tersedia)
func GetOrCreateRoom(c *gin.Context) {
	userIdentifier := c.Query("identifier")
	if userIdentifier == "" {
		// Fallback cek "gmail" untuk backward compatibility
		userIdentifier = c.Query("gmail")
	}
	if userIdentifier == "" {
		identifierRaw, exists := c.Get("identifier")
		if exists {
			userIdentifier = fmt.Sprintf("%v", identifierRaw)
		}
	}
	if userIdentifier == "" {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Identifier (NIM/NIP) tidak boleh kosong"})
		return
	}

	targetAdmin := c.Query("admin_identifier")
	if targetAdmin == "" {
		targetAdmin = c.Query("participant_b_identifier")
	}
	roomType := c.Query("room_type")
	if roomType == "" {
		roomType = "user_to_admin"
	}

	hasNewCols := HasChatColumns()

	if hasNewCols && targetAdmin != "" {
		var room models.ChatRoom
		err := database.DB.QueryRow(`
			SELECT id, user_identifier, COALESCE(room_type, 'user_to_admin'), COALESCE(participant_b_identifier, ''), COALESCE(participant_b_role, ''), COALESCE(last_message, ''), updated_at,
			(SELECT COUNT(*) FROM chat_messages WHERE room_id = chat_rooms.id AND sender_identifier != $1 AND is_read = 0) as unread_count,
			is_marked_unread
			FROM chat_rooms 
			WHERE user_identifier = $1 AND participant_b_identifier = $2`, userIdentifier, targetAdmin).
			Scan(&room.ID, &room.UserIdentifier, &room.RoomType, &room.ParticipantBIdentifier, &room.ParticipantBRole, &room.LastMessage, &room.UpdatedAt, &room.UnreadCount, &room.IsMarkedUnread)

		if err == sql.ErrNoRows {
			var adminRole string
			_ = database.DB.QueryRow("SELECT role::text FROM authentication WHERE identifier = $1", targetAdmin).Scan(&adminRole)
			if adminRole == "" {
				adminRole = "admin"
			}

			errInsert := database.DB.QueryRow(`
				INSERT INTO chat_rooms (user_identifier, room_type, participant_b_identifier, participant_b_role)
				VALUES ($1, $2, $3, $4)
				RETURNING id`,
				userIdentifier, roomType, targetAdmin, adminRole,
			).Scan(&room.ID)
			if errInsert != nil {
				c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuat room chat: " + errInsert.Error()})
				return
			}
			room.UserIdentifier = userIdentifier
			room.RoomType = roomType
			room.ParticipantBIdentifier = targetAdmin
			room.ParticipantBRole = adminRole
		} else if err != nil {
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mencari room: " + err.Error()})
			return
		}

		c.JSON(http.StatusOK, room)
		return
	}

	// Fallback lama jika targetAdmin kosong ATAU kolom baru belum ada (1 user = 1 room)
	var room models.ChatRoom
	err := database.DB.QueryRow(`
		SELECT id, user_identifier, COALESCE(last_message, ''), updated_at,
		(SELECT COUNT(*) FROM chat_messages WHERE room_id = chat_rooms.id AND sender_identifier != chat_rooms.user_identifier AND is_read = 0) as unread_count,
		is_marked_unread
		FROM chat_rooms WHERE user_identifier = $1`, userIdentifier).
		Scan(&room.ID, &room.UserIdentifier, &room.LastMessage, &room.UpdatedAt, &room.UnreadCount, &room.IsMarkedUnread)

	if err == sql.ErrNoRows {
		fmt.Printf("[INFO] Creating new room for: %s\n", userIdentifier)
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

// SendMessage - Post a new message with permission validation
func SendMessage(c *gin.Context) {
	var msg models.ChatMessage
	if err := c.ShouldBindJSON(&msg); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data pesan tidak valid"})
		return
	}

	roleRaw, _ := c.Get("role")
	callerRole, _ := roleRaw.(string)
	identifierRaw, _ := c.Get("identifier")
	callerID, _ := identifierRaw.(string)

	if msg.SenderIdentifier == "" {
		msg.SenderIdentifier = callerID
	} else if msg.SenderIdentifier != callerID && !isAdminDev(callerRole) {
		msg.SenderIdentifier = callerID
	}

	hasNewCols := HasChatColumns()
	if hasNewCols {
		var roomUserIdentifier, roomParticipantB sql.NullString
		errRoom := database.DB.QueryRow(
			"SELECT user_identifier, participant_b_identifier FROM chat_rooms WHERE id = $1",
			msg.RoomID,
		).Scan(&roomUserIdentifier, &roomParticipantB)
		if errRoom != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Room chat tidak ditemukan"})
			return
		}

		userA := roomUserIdentifier.String
		userB := roomParticipantB.String

		if isBuildingAdmin(callerRole) {
			if userB != callerID && userA != callerID {
				c.JSON(http.StatusForbidden, gin.H{"error": "Akses ditolak: Anda tidak memiliki akses ke room ini"})
				return
			}
		} else if !isAdminDev(callerRole) {
			if userA != callerID && userB != callerID {
				c.JSON(http.StatusForbidden, gin.H{"error": "Akses ditolak: Anda bukan partisipan dalam room ini"})
				return
			}
		}
	} else {
		var roomUserIdentifier string
		errRoom := database.DB.QueryRow("SELECT user_identifier FROM chat_rooms WHERE id = $1", msg.RoomID).Scan(&roomUserIdentifier)
		if errRoom != nil {
			c.JSON(http.StatusNotFound, gin.H{"error": "Room chat tidak ditemukan"})
			return
		}
		if !isAnyAdmin(callerRole) && roomUserIdentifier != callerID {
			c.JSON(http.StatusForbidden, gin.H{"error": "Akses ditolak: Anda bukan partisipan dalam room ini"})
			return
		}
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
	rows, err := database.DB.Query("SELECT username, identifier FROM authentication WHERE role::text NOT IN ('admin', 'admin_dev', 'admin_sfd', 'admin_le', 'admin_ls') ORDER BY username ASC")
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
	roleRaw, _ := c.Get("role")
	callerRole, _ := roleRaw.(string)
	if !isAdminDev(callerRole) {
		c.JSON(http.StatusForbidden, gin.H{"error": "Broadcast hanya dapat dilakukan oleh Admin Utama / AdminDev"})
		return
	}

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
		rows, err := database.DB.Query("SELECT identifier FROM authentication WHERE role::text NOT IN ('admin', 'admin_dev', 'admin_sfd', 'admin_le', 'admin_ls')")
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

	roleRaw, _ := c.Get("role")
	callerRole, _ := roleRaw.(string)
	identifierRaw, _ := c.Get("identifier")
	callerID, _ := identifierRaw.(string)

	tx, err := database.DB.Begin()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal memulai transaksi"})
		return
	}

	hasNewCols := HasChatColumns()

	for _, rid := range req.RoomIDs {
		// Validasi jika admin gedung: hanya boleh hapus room miliknya
		if isBuildingAdmin(callerRole) {
			if hasNewCols {
				var allowed bool
				_ = tx.QueryRow(
					"SELECT EXISTS(SELECT 1 FROM chat_rooms WHERE id = $1 AND participant_b_identifier = $2)",
					rid, callerID,
				).Scan(&allowed)
				if !allowed {
					tx.Rollback()
					c.JSON(http.StatusForbidden, gin.H{"error": "Anda tidak memiliki izin menghapus room ini"})
					return
				}
			} else {
				tx.Rollback()
				c.JSON(http.StatusForbidden, gin.H{"error": "Admin gedung tidak memiliki izin menghapus room sebelum migrasi schema"})
				return
			}
		}

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

// GetAdminInfo - Mengambil info profil Admin UNJ (avatar_url, nama) untuk sisi user
func GetAdminInfo(c *gin.Context) {
	adminID := c.Query("admin_identifier")
	if adminID == "" {
		adminID = c.Query("identifier")
	}

	var avatarURL sql.NullString
	var fullName sql.NullString
	var username sql.NullString
	var role sql.NullString

	query := `
		SELECT 
			COALESCE(p.avatar_url, ''),
			COALESCE(p.full_name, ''),
			COALESCE(a.username, 'Admin UNJ'),
			COALESCE(a.role::text, 'admin')
		FROM authentication a
		LEFT JOIN profiles p ON a.id = p.user_id
		WHERE a.role::text IN ('admin', 'admin_dev', 'admin_sfd', 'admin_le', 'admin_ls')
		  AND ($1 = '' OR a.identifier = $1)
		ORDER BY a.id ASC
		LIMIT 1`

	err := database.DB.QueryRow(query, adminID).Scan(&avatarURL, &fullName, &username, &role)
	if err != nil && err != sql.ErrNoRows {
		log.Println("[WARN] GetAdminInfo error:", err)
	}

	av := avatarURL.String
	if av == "" {
		av = "/LogoSiRuangPolos.png"
	}

	fn := fullName.String
	if fn == "" {
		fn = username.String
	}
	if fn == "" {
		fn = "Admin UNJ"
	}

	r := role.String
	if r == "" {
		r = "admin"
	}

	c.JSON(http.StatusOK, gin.H{
		"avatar_url": av,
		"avatarUrl":  av,
		"name":       fn,
		"full_name":  fn,
		"role":       r,
	})
}

// SearchAdmin - Mencari akun admin berdasarkan nama/username (hanya untuk user yang login)
func SearchAdmin(c *gin.Context) {
	q := strings.TrimSpace(c.Query("q"))

	query := `
		SELECT 
			a.id,
			a.identifier,
			a.username,
			COALESCE(NULLIF(p.full_name, ''), a.username) as full_name,
			a.role::text,
			COALESCE(p.avatar_url, '/LogoSiRuangPolos.png') as avatar_url
		FROM authentication a
		LEFT JOIN profiles p ON a.id = p.user_id
		WHERE a.role::text IN ('admin', 'admin_dev', 'admin_sfd', 'admin_le', 'admin_ls')
		  AND (
		      $1 = '' 
		      OR a.username ILIKE '%' || $1 || '%' 
		      OR p.full_name ILIKE '%' || $1 || '%'
		      OR a.identifier ILIKE '%' || $1 || '%'
		  )
		ORDER BY a.id ASC
		LIMIT 20`

	rows, err := database.DB.Query(query, q)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mencari admin: " + err.Error()})
		return
	}
	defer rows.Close()

	type AdminResult struct {
		ID         int    `json:"id"`
		Identifier string `json:"identifier"`
		Username   string `json:"username"`
		FullName   string `json:"full_name"`
		Role       string `json:"role"`
		AvatarURL  string `json:"avatar_url"`
	}

	var results []AdminResult
	for rows.Next() {
		var adm AdminResult
		if err := rows.Scan(&adm.ID, &adm.Identifier, &adm.Username, &adm.FullName, &adm.Role, &adm.AvatarURL); err != nil {
			continue
		}
		if adm.AvatarURL == "" {
			adm.AvatarURL = "/LogoSiRuangPolos.png"
		}
		results = append(results, adm)
	}

	if results == nil {
		results = []AdminResult{}
	}

	if q == "" {
		knownRoles := make(map[string]bool)
		for _, r := range results {
			knownRoles[r.Role] = true
		}
		fallbacks := []AdminResult{
			{ID: 991, Identifier: "admin", Username: "Admin UNJ", FullName: "Admin UNJ", Role: "admin", AvatarURL: "/LogoSiRuangPolos.png"},
			{ID: 992, Identifier: "980101000101", Username: "Admin SFD", FullName: "Admin Gedung SFD", Role: "admin_sfd", AvatarURL: "/LogoSiRuangPolos.png"},
			{ID: 993, Identifier: "980101000201", Username: "Admin LE", FullName: "Admin Gedung LE", Role: "admin_le", AvatarURL: "/LogoSiRuangPolos.png"},
			{ID: 994, Identifier: "980101000301", Username: "Admin LS", FullName: "Admin Gedung LS", Role: "admin_ls", AvatarURL: "/LogoSiRuangPolos.png"},
		}
		for _, fb := range fallbacks {
			if !knownRoles[fb.Role] && !(fb.Role == "admin" && knownRoles["admin_dev"]) {
				results = append(results, fb)
			}
		}
	}

	c.JSON(http.StatusOK, results)
}

