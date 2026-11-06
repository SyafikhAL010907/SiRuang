package database

import (
	"database/sql"
	"fmt"
	"log"
	"os"

	_ "github.com/lib/pq"
)

var DB *sql.DB

func InitDB() {
	var err error

	dbUser := os.Getenv("DB_USER")
	dbPass := os.Getenv("DB_PASSWORD")
	dbHost := os.Getenv("DB_HOST")
	dbPort := os.Getenv("DB_PORT")
	dbName := os.Getenv("DB_NAME")
	sslMode := os.Getenv("DB_SSLMODE")

	if dbUser == "" {
		dbUser = "postgres"
	}
	if dbHost == "" {
		dbHost = "localhost"
	}
	if dbPort == "" {
		dbPort = "5432"
	}
	if dbName == "" {
		dbName = "postgres"
	}
	if sslMode == "" {
		sslMode = "require"
	}

	dsn := fmt.Sprintf("host=%s port=%s user=%s password=%s dbname=%s sslmode=%s",
		dbHost, dbPort, dbUser, dbPass, dbName, sslMode)
	DB, err = sql.Open("postgres", dsn)
	if err != nil {
		log.Fatal(err)
	}

	DB.SetMaxOpenConns(25)
	DB.SetMaxIdleConns(5)

	err = DB.Ping()
	if err != nil {
		log.Printf("[WARN] Supabase PostgreSQL not reachable yet (check credentials in .env): %v\n", err)
		return
	}
	fmt.Println("Connected to Supabase PostgreSQL (SiRuang)!")
}

