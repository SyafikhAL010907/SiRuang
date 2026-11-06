package handlers

import (
	"fmt"
	"net/http"
	"time"

	"helpdesk-backend/internal/database"
	"helpdesk-backend/internal/middleware"
	"helpdesk-backend/internal/models"

	"github.com/dgrijalva/jwt-go"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
)

const MaxAdminDevices = 4

func HandleSignUp(c *gin.Context) {
	var req struct {
		Username       string `json:"username"`
		Identifier     string `json:"identifier"`
		IdentifierType string `json:"identifier_type"`
		Password       string `json:"password"`
		Role           string `json:"role"`
	}
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data tidak valid"})
		return
	}

	if req.IdentifierType == "" {
		req.IdentifierType = "nim"
	}
	if req.Role == "" {
		if req.IdentifierType == "nip" {
			req.Role = "dosen"
		} else {
			req.Role = "user"
		}
	}

	hashedPassword, _ := bcrypt.GenerateFromPassword([]byte(req.Password), 14)

	_, err := database.DB.Exec(
		"INSERT INTO authentication (username, identifier, identifier_type, password, role) VALUES ($1, $2, $3, $4, $5)",
		req.Username, req.Identifier, req.IdentifierType, string(hashedPassword), req.Role,
	)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mendaftarkan akun. NIM/NIP mungkin sudah terdaftar."})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Pendaftaran berhasil!"})
}

func HandleLogin(c *gin.Context) {
	var loginData struct {
		Identifier string `json:"identifier"`
		Password   string `json:"password"`
	}

	if err := c.ShouldBindJSON(&loginData); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data tidak valid"})
		return
	}

	var user models.User
	err := database.DB.QueryRow(
		"SELECT id, username, identifier, identifier_type, password, role FROM authentication WHERE identifier = $1",
		loginData.Identifier,
	).Scan(&user.ID, &user.Username, &user.Identifier, &user.IdentifierType, &user.Password, &user.Role)

	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "NIM/NIP atau Password salah"})
		return
	}

	err = bcrypt.CompareHashAndPassword([]byte(user.Password), []byte(loginData.Password))
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "NIM/NIP atau Password salah"})
		return
	}

	// Fitur Batasan Perangkat Sesi Aktif
	var activeCount int
	database.DB.QueryRow("SELECT COUNT(*) FROM active_sessions WHERE identifier = $1", user.Identifier).Scan(&activeCount)

	switch user.Role {
	case "admin":
		database.DB.Exec("DELETE FROM active_sessions WHERE last_activity < $1", time.Now().Add(-24*time.Hour))
		fmt.Printf("[DEBUG] Admin Login: %s, Active Sessions: %d, Max: %d\n", user.Identifier, activeCount, MaxAdminDevices)
		if activeCount >= MaxAdminDevices {
			c.JSON(http.StatusForbidden, gin.H{"error": "Batas maksimal device/orang tercapai untuk Admin"})
			return
		}
	case "dosen":
		if activeCount >= 2 {
			c.JSON(http.StatusForbidden, gin.H{"error": "Batas maksimal device tercapai untuk Dosen (maksimal 2 perangkat)"})
			return
		}
	case "user", "pj_kelas":
		if activeCount >= 1 {
			c.JSON(http.StatusForbidden, gin.H{"error": "Akun sedang digunakan di perangkat lain. Silakan logout terlebih dahulu."})
			return
		}
	}

	expirationTime := time.Now().Add(24 * time.Hour)
	claims := &models.Claims{
		Identifier:     user.Identifier,
		IdentifierType: user.IdentifierType,
		Role:           user.Role,
		Username:       user.Username,
		StandardClaims: jwt.StandardClaims{
			ExpiresAt: expirationTime.Unix(),
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, _ := token.SignedString(middleware.JwtKey)

	_, err = database.DB.Exec("INSERT INTO active_sessions (identifier, session_id) VALUES ($1, $2)", user.Identifier, tokenString)
	if err != nil {
		fmt.Printf("[ERROR] Gagal mencatat session: %v\n", err)
	}

	fmt.Printf("[DEBUG] Login Berhasil: %s (Role: %s, Name: %s)\n", user.Identifier, user.Role, user.Username)

	c.JSON(http.StatusOK, gin.H{
		"token":           tokenString,
		"username":        user.Username,
		"identifier":      user.Identifier,
		"identifier_type": user.IdentifierType,
		"role":            user.Role,
	})
}

func GetCaptcha(c *gin.Context) {
	var captcha models.Captcha
	err := database.DB.QueryRow("SELECT kode, pertanyaan, jawaban FROM captcha ORDER BY RANDOM() LIMIT 1").
		Scan(&captcha.Kode, &captcha.Pertanyaan, &captcha.Jawaban)

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal mengambil captcha: " + err.Error()})
		return
	}

	c.JSON(http.StatusOK, captcha)
}

func HandleLogout(c *gin.Context) {
	identifier, _ := c.Get("identifier")
	role, _ := c.Get("role")

	authHeader := c.GetHeader("Authorization")
	token := authHeader
	if len(authHeader) > 7 && authHeader[:7] == "Bearer " {
		token = authHeader[7:]
	}

	var err error
	if role == "user" || role == "pj_kelas" {
		_, err = database.DB.Exec("DELETE FROM active_sessions WHERE identifier = $1", identifier)
	} else {
		_, err = database.DB.Exec("DELETE FROM active_sessions WHERE identifier = $1 AND session_id = $2", identifier, token)
	}

	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal logout"})
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "Berhasil logout, status kini Offline"})
}
