package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func AdminDashboard(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"message": "Welcome to Admin Dashboard"})
}
