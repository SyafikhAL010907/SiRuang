package middleware

import (
	"net/http"
	"os"
	"strings"

	"helpdesk-backend/internal/database"
	"helpdesk-backend/internal/models"

	"github.com/dgrijalva/jwt-go"
	"github.com/gin-gonic/gin"
)

var JwtKey []byte

func init() {
	secret := os.Getenv("JWT_SECRET")
	if secret == "" {
		secret = "siruang_default_secret_key"
	}
	JwtKey = []byte(secret)
}

func AuthMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		authHeader := c.GetHeader("Authorization")
		if authHeader == "" {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authorization header is required"})
			c.Abort()
			return
		}

		tokenString := strings.Replace(authHeader, "Bearer ", "", 1)
		claims := &models.Claims{}

		token, err := jwt.ParseWithClaims(tokenString, claims, func(token *jwt.Token) (interface{}, error) {
			return JwtKey, nil
		})

		if err != nil || !token.Valid {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid token"})
			c.Abort()
			return
		}

		// Validasi apakah sesi masih aktif di database PostgreSQL ($1, $2)
		if database.DB != nil {
			var sessionExists bool
			err = database.DB.QueryRow(
				"SELECT EXISTS(SELECT 1 FROM active_sessions WHERE identifier = $1 AND session_id = $2)",
				claims.Identifier, tokenString,
			).Scan(&sessionExists)

			if err != nil || !sessionExists {
				c.JSON(http.StatusUnauthorized, gin.H{"error": "Sesi telah berakhir atau login di perangkat lain"})
				c.Abort()
				return
			}
		}

		// Ambil user_id untuk context: prioritaskan dari token JWT, atau query users/authentication
		userID := claims.UserID
		if userID == 0 && database.DB != nil {
			err = database.DB.QueryRow("SELECT id FROM users WHERE identifier = $1", claims.Identifier).Scan(&userID)
			if err != nil || userID == 0 {
				_ = database.DB.QueryRow("SELECT id FROM authentication WHERE identifier = $1", claims.Identifier).Scan(&userID)
			}
		}

		c.Set("user_id", userID)
		c.Set("identifier", claims.Identifier)
		c.Set("identifier_type", claims.IdentifierType)
		c.Set("role", claims.Role)
		c.Set("username", claims.Username)
		c.Next()
	}
}

func RoleMiddleware(allowedRoles ...string) gin.HandlerFunc {
	return func(c *gin.Context) {
		role, exists := c.Get("role")
		if !exists {
			c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
			c.Abort()
			return
		}
		roleStr := role.(string)
		for _, allowed := range allowedRoles {
			if roleStr == allowed {
				c.Next()
				return
			}
		}
		c.JSON(http.StatusForbidden, gin.H{"error": "Access denied"})
		c.Abort()
	}
}
