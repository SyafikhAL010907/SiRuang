package profile

import (
	"errors"
	"io"
	"net/http"
	"strings"

	"helpdesk-backend/internal/fileguard"

	"github.com/gin-gonic/gin"
)

type Handler struct {
	service Service
}

func NewHandler(service Service) *Handler {
	return &Handler{service: service}
}

func getUserIDFromContext(c *gin.Context) (int, bool) {
	val, exists := c.Get("user_id")
	if !exists {
		return 0, false
	}

	switch v := val.(type) {
	case int:
		return v, v > 0
	case int64:
		return int(v), v > 0
	case float64:
		return int(v), v > 0
	default:
		return 0, false
	}
}

// GetProfile (GET /api/profile)
func (h *Handler) GetProfile(c *gin.Context) {
	userID, ok := getUserIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: user_id tidak ditemukan pada sesi"})
		return
	}

	res, err := h.service.GetProfile(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, res)
}

// UpdateProfile (PUT /api/profile)
func (h *Handler) UpdateProfile(c *gin.Context) {
	userID, ok := getUserIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: user_id tidak ditemukan pada sesi"})
		return
	}

	var req UpdateProfileRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Data request tidak valid"})
		return
	}

	res, err := h.service.UpdateProfile(c.Request.Context(), userID, &req)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, res)
}

// UploadAvatar (POST /api/profile/avatar)
func (h *Handler) UploadAvatar(c *gin.Context) {
	userID, ok := getUserIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: user_id tidak ditemukan pada sesi"})
		return
	}

	// Batasi ukuran request body sejak awal agar server aman dari payload raksasa
	c.Request.Body = http.MaxBytesReader(c.Writer, c.Request.Body, fileguard.MaxAvatarBytes+1024)

	// Parse multipart form dengan memori kecil (32 KB)
	if err := c.Request.ParseMultipartForm(32 << 10); err != nil {
		var maxErr *http.MaxBytesError
		if errors.As(err, &maxErr) || strings.Contains(strings.ToLower(err.Error()), "too large") {
			c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": fileguard.ErrFileTooLarge.Error()})
			return
		}
		c.JSON(http.StatusBadRequest, gin.H{"error": "Gagal membaca form multipart"})
		return
	}

	fileHeader, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Field 'file' wajib diisi"})
		return
	}

	// Cek ukuran sebelum membaca
	if fileHeader.Size > fileguard.MaxAvatarBytes {
		c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": fileguard.ErrFileTooLarge.Error()})
		return
	}
	if fileHeader.Size == 0 {
		c.JSON(http.StatusBadRequest, gin.H{"error": fileguard.ErrInvalidImageContent.Error()})
		return
	}

	file, err := fileHeader.Open()
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membuka file yang diunggah"})
		return
	}
	defer file.Close()

	// Baca data file
	fileBytes, err := io.ReadAll(io.LimitReader(file, fileguard.MaxAvatarBytes+1))
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Gagal membaca isi file"})
		return
	}
	if len(fileBytes) > fileguard.MaxAvatarBytes {
		c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": fileguard.ErrFileTooLarge.Error()})
		return
	}

	contentType := fileHeader.Header.Get("Content-Type")

	res, err := h.service.UploadAvatar(c.Request.Context(), userID, fileHeader.Filename, contentType, fileBytes)
	if err != nil {
		switch {
		case errors.Is(err, fileguard.ErrFileTooLarge):
			c.JSON(http.StatusRequestEntityTooLarge, gin.H{"error": err.Error()})
		case errors.Is(err, fileguard.ErrUnsupportedFormat):
			c.JSON(http.StatusUnsupportedMediaType, gin.H{"error": err.Error()})
		case errors.Is(err, fileguard.ErrInvalidFileName), errors.Is(err, fileguard.ErrInvalidImageContent):
			c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		default:
			c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		}
		return
	}

	c.JSON(http.StatusOK, res)
}

// DeleteAvatar (DELETE /api/profile/avatar)
func (h *Handler) DeleteAvatar(c *gin.Context) {
	userID, ok := getUserIDFromContext(c)
	if !ok {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Unauthorized: user_id tidak ditemukan pada sesi"})
		return
	}

	res, err := h.service.DeleteAvatar(c.Request.Context(), userID)
	if err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
		return
	}

	c.JSON(http.StatusOK, res)
}

