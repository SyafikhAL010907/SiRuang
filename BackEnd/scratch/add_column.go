package main

import (
	"fmt"
	"log"

	"helpdesk-backend/internal/database"

	"github.com/joho/godotenv"
)

func main() {
	if err := godotenv.Load("../.env"); err != nil {
		log.Println("Gagal load .env:", err)
	}

	database.InitDB()

	_, err := database.DB.Exec("ALTER TABLE chat_rooms ADD COLUMN is_marked_unread BOOLEAN DEFAULT 0")
	if err != nil {
		fmt.Println("Gagal add column is_marked_unread (mungkin sudah ada):", err)
	} else {
		fmt.Println("Berhasil add column is_marked_unread!")
	}
}
