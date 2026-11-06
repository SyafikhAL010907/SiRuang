package database

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/go-sql-driver/mysql"
)

var DB *sql.DB

func InitDB() {
	var err error
	
	dbUser := os.Getenv("DB_USER")
	dbPass := os.Getenv("DB_PASSWORD")
	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbName := os.Getenv("DB_NAME")

	// Fallback to defaults if .env not loaded yet (or not provided)
	if dbUser == "" { dbUser = "root" }
	if dbHost == "" { dbHost = "127.0.0.1" }
	if dbPort == "" { dbPort = "3306" }
	if dbName == "" { dbName = "help_desk_admisi" }

	dsn := fmt.Sprintf("%s:%s@tcp(%s:%s)/%s?parseTime=true&loc=Local", dbUser, dbPass, dbHost, dbPort, dbName)
	DB, err = sql.Open("mysql", dsn)
	if err != nil {
		log.Fatal(err)
	}

	err = DB.Ping()
	if err != nil {
		log.Fatal("Database not reachable: ", err)
	}
	fmt.Println("Connected to MySQL (help_desk_admisi)!")
}
