package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func UserProfile(c *gin.Context) {
	gmail, _ := c.Get("gmail")
	c.JSON(http.StatusOK, gin.H{"message": "Welcome to User Profile", "gmail": gmail})
}
