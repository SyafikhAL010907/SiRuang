package main

// =============================================================================
// FILE: BackEnd/cmd/api/main.go
// ⚠️  CARA DISABLE FITUR AI:
//   1. Comment baris: handlers.StartAIWorker(os.Getenv("ML_SERVICE_URL"))
//   2. Comment baris: admin.POST("/ai/toggle", handlers.ToggleAI)
//   3. Comment baris: admin.GET("/ai/status", handlers.GetAIStatus)
//   Semua fitur lain (chat, auth, dll) TIDAK akan terpengaruh.
//   Detail lengkap: MachineLearning/DISABLE_GUIDE.md
// =============================================================================

import (
	"fmt"
	"log"
	"os"
	"time"

	"helpdesk-backend/internal/database"
	"helpdesk-backend/internal/handlers"
	"helpdesk-backend/internal/middleware"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load .env file
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, relying on OS environment variables")
	}

	database.InitDB()
	r := gin.Default()

	// CORS Setup
	frontendUrl := os.Getenv("FRONTEND_URL")
	allowedOrigins := []string{"http://localhost:3000"}
	if frontendUrl != "" && frontendUrl != "http://localhost:3000" {
		allowedOrigins = append(allowedOrigins, frontendUrl)
	}

	r.Use(cors.New(cors.Config{
		AllowOrigins:     allowedOrigins,
		AllowMethods:     []string{"POST", "GET", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Public Routes
	r.POST("/api/signup", handlers.HandleSignUp)
	r.POST("/api/login", handlers.HandleLogin)
	r.GET("/api/captcha", handlers.GetCaptcha)
	// Protected Routes
	protected := r.Group("/api")
	protected.Use(middleware.AuthMiddleware())
	{
		// User Routes
		protected.GET("/user/profile", handlers.UserProfile)
		protected.POST("/logout", handlers.HandleLogout)

		// Chat Routes (Shared)
		protected.GET("/chat/user-room", handlers.GetOrCreateRoom)
		protected.GET("/chat/messages/:room_id", handlers.GetMessages)
		protected.POST("/chat/send", handlers.SendMessage)
		protected.POST("/chat/mark-read/:room_id", handlers.MarkAsRead)

		// Admin Routes
		admin := protected.Group("/admin")
		admin.Use(middleware.RoleMiddleware("admin"))
		{
			admin.GET("/dashboard", handlers.AdminDashboard)
			admin.GET("/stats", handlers.GetStats)
			admin.GET("/users", handlers.GetAllUsers)
			admin.GET("/chat/rooms", handlers.GetRooms)
			admin.POST("/chat/mark-read/:room_id", handlers.MarkAsRead)
			admin.POST("/chat/mark-unread/:room_id", handlers.MarkAsUnread)
			admin.POST("/chat/broadcast", handlers.BroadcastMessage)
			admin.POST("/chat/delete-bulk", handlers.BulkDeleteRooms)

			// ── AI Auto-Response Routes ──────────────────────────────────────
			// ⚠️  DISABLE: Comment 2 baris di bawah ini untuk matikan endpoint AI
			admin.POST("/ai/toggle", handlers.ToggleAI)   // Toggle AI ON/OFF
			admin.GET("/ai/status", handlers.GetAIStatus) // Cek status AI
			// ─────────────────────────────────────────────────────────────────
		}
	}

	// ── AI Background Worker ─────────────────────────────────────────────────
	// ⚠️  DISABLE: Comment baris StartAIWorker di bawah ini untuk matikan AI worker
	// Fitur chat biasa TIDAK terpengaruh jika di-comment
	mlServiceURL := os.Getenv("ML_SERVICE_URL")
	if mlServiceURL == "" {
		mlServiceURL = "http://localhost:8000" // default ML service URL
	}
	handlers.StartAIWorker(mlServiceURL) // ⚠️  Comment baris ini untuk disable AI worker
	log.Printf("[AI] Worker dimulai, ML Service: %s", mlServiceURL)
	// ─────────────────────────────────────────────────────────────────────────

	port := os.Getenv("SERVER_PORT")
	if port == "" {
		port = "8080"
	}

	fmt.Println("Server running on :" + port)
	r.Run(":" + port)
}
