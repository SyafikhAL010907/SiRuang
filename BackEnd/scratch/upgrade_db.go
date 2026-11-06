package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/go-sql-driver/mysql"
)

func UpgradeDB() {
	dsn := "root:@tcp(127.0.0.1:3306)/help_desk_admisi?parseTime=true&loc=Local"
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	fmt.Println("Upgrading database schema...")

	// 1. Ubah message di chat_messages jadi LONGTEXT
	_, err = db.Exec("ALTER TABLE chat_messages MODIFY message LONGTEXT NOT NULL")
	if err != nil {
		log.Fatal("Gagal upgrade chat_messages: ", err)
	}
	fmt.Println("- chat_messages.message upgraded to LONGTEXT")

	// 2. Ubah last_message di chat_rooms jadi LONGTEXT (biar aman kalau ada preview panjang)
	_, err = db.Exec("ALTER TABLE chat_rooms MODIFY last_message LONGTEXT")
	if err != nil {
		log.Fatal("Gagal upgrade chat_rooms: ", err)
	}
	fmt.Println("- chat_rooms.last_message upgraded to LONGTEXT")

	fmt.Println("Database upgrade SUCCESSFUL! Sekarang kirim file 1MB pun aman bro!")
}
