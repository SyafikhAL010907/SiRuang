package models

import "time"

type ChatRoom struct {
	ID          int       `json:"id"`
	UserGmail   string    `json:"user_gmail"`
	LastMessage string    `json:"last_message"`
	UnreadCount int       `json:"unread_count"`
	UpdatedAt   time.Time `json:"updated_at"`
	UserName       string    `json:"user_name,omitempty"` // Buat nampilin nama user di sidebar admin
	IsOnline       bool      `json:"is_online"`           // Status online user
	IsMarkedUnread bool      `json:"is_marked_unread"`    // Status ditandai belum dibaca oleh admin
}

type ChatMessage struct {
	ID          int       `json:"id"`
	RoomID      int       `json:"room_id"`
	SenderGmail string    `json:"sender_gmail"`
	Message     string    `json:"message"`
	MessageType string    `json:"message_type"` // text, file, image
	IsRead      int       `json:"is_read"`
	CreatedAt   time.Time `json:"created_at"`
}
