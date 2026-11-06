package models

import "github.com/dgrijalva/jwt-go"

type User struct {
	ID             int    `json:"id"`
	Username       string `json:"username"`
	Identifier     string `json:"identifier"`
	IdentifierType string `json:"identifier_type"`
	Password       string `json:"password"`
	Role           string `json:"role"`
	CreatedAt      string `json:"created_at"`
}

type Claims struct {
	Identifier     string `json:"identifier"`
	IdentifierType string `json:"identifier_type"`
	Role           string `json:"role"`
	Username       string `json:"username"`
	jwt.StandardClaims
}
