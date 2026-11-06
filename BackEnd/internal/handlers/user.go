package handlers

import (
	"net/http"

	"github.com/gin-gonic/gin"
)

func UserProfile(c *gin.Context) {
	identifier, _ := c.Get("identifier")
	identifierType, _ := c.Get("identifier_type")
	role, _ := c.Get("role")
	username, _ := c.Get("username")

	c.JSON(http.StatusOK, gin.H{
		"message":         "Welcome to User Profile",
		"identifier":      identifier,
		"identifier_type": identifierType,
		"role":            role,
		"username":        username,
	})
}
