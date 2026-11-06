package main

import (
	"database/sql"
	"fmt"
	"log"

	_ "github.com/go-sql-driver/mysql"
)

func CheckDB() {			
	dsn := "root:@tcp(127.0.0.1:3306)/help_desk_admisi?parseTime=true&loc=Local"
	db, err := sql.Open("mysql", dsn)
	if err != nil {
		log.Fatal(err)
	}
	defer db.Close()

	rows, err := db.Query("DESCRIBE chat_messages")
	if err != nil {
		log.Fatal(err)
	}
	defer rows.Close()

	fmt.Println("Field | Type | Null | Key | Default | Extra")
	for rows.Next() {
		var field, typ, null, key, extra sql.NullString
		var def sql.NullString
		err := rows.Scan(&field, &typ, &null, &key, &def, &extra)
		if err != nil {
			log.Fatal(err)
		}
		fmt.Printf("%s | %s | %s | %s | %s | %s\n", field.String, typ.String, null.String, key.String, def.String, extra.String)
	}
}
