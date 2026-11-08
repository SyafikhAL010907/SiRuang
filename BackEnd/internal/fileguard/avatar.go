package fileguard

import (
	"bytes"
	"errors"
	"net/http"
	"path/filepath"
	"strings"
	"unicode"
)

const (
	// MaxAvatarBytes adalah batas maksimal ukuran file avatar (1 MB).
	MaxAvatarBytes = 1 * 1024 * 1024
	MaxFileNameLen = 100
)

var (
	ErrInvalidFileName    = errors.New("Nama file tidak valid. Gunakan file dengan satu ekstensi saja, misalnya foto.png atau foto.jpg.")
	ErrUnsupportedFormat  = errors.New("Format file tidak didukung. Hanya PNG, JPG, dan JPEG yang diperbolehkan.")
	ErrFileTooLarge       = errors.New("Ukuran file terlalu besar. Maksimal 1 MB.")
	ErrInvalidImageContent = errors.New("File ini bukan gambar PNG/JPG yang valid.")
)

// Magic bytes header untuk PNG dan JPEG
var (
	pngMagic  = []byte{0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A}
	jpegMagic = []byte{0xFF, 0xD8, 0xFF}
)

// ValidateAvatar memeriksa keabsahan file avatar dari sisi nama file, ukuran,
// MIME type header multipart, dan magic bytes dari isi file.
// Mengembalikan canonical extension ("png" atau "jpg") jika valid.
func ValidateAvatar(fileName string, contentType string, data []byte) (string, error) {
	// 1. Cek ukuran file
	fileLen := len(data)
	if fileLen == 0 {
		return "", ErrInvalidImageContent
	}
	if fileLen > MaxAvatarBytes {
		return "", ErrFileTooLarge
	}

	// 2. Validasi nama file
	cleanName := strings.TrimSpace(fileName)
	if cleanName == "" || len(cleanName) > MaxFileNameLen {
		return "", ErrInvalidFileName
	}

	// Tolak jika mengandung path separator (/ atau \) atau null byte
	if strings.ContainsAny(cleanName, "/\\\x00") {
		return "", ErrInvalidFileName
	}

	// Tolak jika mengandung karakter kontrol
	for _, r := range cleanName {
		if unicode.IsControl(r) {
			return "", ErrInvalidFileName
		}
	}

	// Tolak jika diawali titik (misal: .png)
	if strings.HasPrefix(cleanName, ".") {
		return "", ErrInvalidFileName
	}

	// Tolak double extension: nama file HARUS memiliki tepat satu titik
	if strings.Count(cleanName, ".") != 1 {
		return "", ErrInvalidFileName
	}

	// Ekstensi huruf kecil
	ext := strings.ToLower(filepath.Ext(cleanName))
	switch ext {
	case ".png":
		// Cocokkan MIME
		if contentType != "image/png" {
			return "", ErrUnsupportedFormat
		}
	case ".jpg", ".jpeg":
		// Cocokkan MIME
		if contentType != "image/jpeg" {
			return "", ErrUnsupportedFormat
		}
	case ".svg", ".gif", ".webp", ".pdf":
		return "", ErrUnsupportedFormat
	default:
		return "", ErrUnsupportedFormat
	}

	// 3. Cek Magic Bytes isi file
	var canonicalExt string
	if ext == ".png" {
		if len(data) < len(pngMagic) || !bytes.Equal(data[:len(pngMagic)], pngMagic) {
			return "", ErrInvalidImageContent
		}
		// Validasi kedua dengan net/http
		detected := http.DetectContentType(data)
		if detected != "image/png" {
			return "", ErrInvalidImageContent
		}
		canonicalExt = "png"
	} else { // .jpg atau .jpeg
		if len(data) < len(jpegMagic) || !bytes.Equal(data[:len(jpegMagic)], jpegMagic) {
			return "", ErrInvalidImageContent
		}
		detected := http.DetectContentType(data)
		if detected != "image/jpeg" {
			return "", ErrInvalidImageContent
		}
		canonicalExt = "jpg" // .jpeg disimpan sebagai .jpg sesuai aturan
	}

	return canonicalExt, nil
}

