package profile

import (
	"github.com/gin-gonic/gin"
)

// RegisterRoutes mendaftarkan endpoint profile di bawah router group yang sudah dilindungi auth middleware.
// Endpoint yang didaftarkan:
//   - GET    /api/profile
//   - PUT    /api/profile
//   - POST   /api/profile/avatar
//   - DELETE /api/profile/avatar
func RegisterRoutes(rg *gin.RouterGroup, handler *Handler) {
	profileGroup := rg.Group("/profile")
	{
		profileGroup.GET("", handler.GetProfile)
		profileGroup.PUT("", handler.UpdateProfile)
		profileGroup.POST("/avatar", handler.UploadAvatar)
		profileGroup.DELETE("/avatar", handler.DeleteAvatar)
	}
}

