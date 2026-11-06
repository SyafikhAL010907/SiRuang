package models

import "github.com/dgrijalva/jwt-go"

type User struct {
	ID        int    `json:"id"`
	Username  string `json:"username"`
	Gmail     string `json:"gmail"`
	Password  string `json:"password"`
	Role      string `json:"role"`
	CreatedAt string `json:"created_at"`
}

type Claims struct {
	Gmail string `json:"gmail"`
	Role  string `json:"role"`
	jwt.StandardClaims
}
