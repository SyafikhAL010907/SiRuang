package handlers

import (
	"helpdesk-backend/internal/database"
	"log"
	"net/http"

	"github.com/gin-gonic/gin"
)

func GetStats(c *gin.Context) {
	var totalUsers int
	query := "SELECT COUNT(*) FROM authentication WHERE role = 'user'"
	err := database.DB.QueryRow(query).Scan(&totalUsers)
	if err != nil {
		log.Println("Database Error in GetStats:", err)
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to fetch user count"})
		return
	}

	c.JSON(http.StatusOK, gin.H{
		"total_users": totalUsers,
	})
}
