package fileguard

import (
	"bytes"
	"errors"
	"testing"
)

// Helper dummies
var (
	validPNGData = []byte{
		0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A,
		0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52,
		0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
		0x08, 0x06, 0x00, 0x00, 0x00, 0x1F, 0x15, 0xC4,
	}

	validJPEGData = []byte{
		0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x10, 0x4A, 0x46,
		0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
		0x00, 0x01, 0x00, 0x00, 0xFF, 0xDB, 0x00, 0x43,
	}

	textData = []byte("Ini adalah file teks biasa yang di-rename menjadi png.")
)

func TestValidateAvatar(t *testing.T) {
	// Buat payload berukuran 1 MB + 1 byte
	oversizedData := bytes.Repeat([]byte{0x01}, MaxAvatarBytes+1)

	tests := []struct {
		name         string
		fileName     string
		contentType  string
		data         []byte
		expectedExt  string
		expectedErr  error
	}{
		// Kasus Diterima
		{
			name:        "Valid foto.png",
			fileName:    "foto.png",
			contentType: "image/png",
			data:        validPNGData,
			expectedExt: "png",
			expectedErr: nil,
		},
		{
			name:        "Valid foto.jpg",
			fileName:    "foto.jpg",
			contentType: "image/jpeg",
			data:        validJPEGData,
			expectedExt: "jpg",
			expectedErr: nil,
		},
		{
			name:        "Valid foto.jpeg (disimpan sebagai jpg)",
			fileName:    "foto.jpeg",
			contentType: "image/jpeg",
			data:        validJPEGData,
			expectedExt: "jpg",
			expectedErr: nil,
		},
		{
			name:        "Valid uppercase FOTO.PNG",
			fileName:    "FOTO.PNG",
			contentType: "image/png",
			data:        validPNGData,
			expectedExt: "png",
			expectedErr: nil,
		},

		// Kasus Ditolak: Double extension
		{
			name:        "Tolak double extension foto.png.sql",
			fileName:    "foto.png.sql",
			contentType: "image/png",
			data:        validPNGData,
			expectedExt: "",
			expectedErr: ErrInvalidFileName,
		},
		{
			name:        "Tolak double extension foto.php.jpg",
			fileName:    "foto.php.jpg",
			contentType: "image/jpeg",
			data:        validJPEGData,
			expectedExt: "",
			expectedErr: ErrInvalidFileName,
		},
		{
			name:        "Tolak double extension x.png.png",
			fileName:    "x.png.png",
			contentType: "image/png",
			data:        validPNGData,
			expectedExt: "",
			expectedErr: ErrInvalidFileName,
		},

		// Kasus Ditolak: Awalan titik / dotfile
		{
			name:        "Tolak file diawali titik .png",
			fileName:    ".png",
			contentType: "image/png",
			data:        validPNGData,
			expectedExt: "",
			expectedErr: ErrInvalidFileName,
		},

		// Kasus Ditolak: Format dilarang (svg, gif)
		{
			name:        "Tolak file SVG foto.svg",
			fileName:    "foto.svg",
			contentType: "image/svg+xml",
			data:        []byte("<svg></svg>"),
			expectedExt: "",
			expectedErr: ErrUnsupportedFormat,
		},
		{
			name:        "Tolak file GIF foto.gif",
			fileName:    "foto.gif",
			contentType: "image/gif",
			data:        []byte("GIF89a"),
			expectedExt: "",
			expectedErr: ErrUnsupportedFormat,
		},

		// Kasus Ditolak: Path traversal / karakter terlarang
		{
			name:        "Tolak path traversal ../foto.png",
			fileName:    "../foto.png",
			contentType: "image/png",
			data:        validPNGData,
			expectedExt: "",
			expectedErr: ErrInvalidFileName,
		},

		// Kasus Ditolak: File teks di-rename png (magic bytes mismatch)
		{
			name:        "Tolak txt di-rename foto.png",
			fileName:    "foto.png",
			contentType: "image/png",
			data:        textData,
			expectedExt: "",
			expectedErr: ErrInvalidImageContent,
		},

		// Kasus Ditolak: File 0 byte
		{
			name:        "Tolak file 0 byte",
			fileName:    "foto.png",
			contentType: "image/png",
			data:        []byte{},
			expectedExt: "",
			expectedErr: ErrInvalidImageContent,
		},

		// Kasus Ditolak: File melebihi batas 1 MB
		{
			name:        "Tolak file melebihi 1 MB (1 MB + 1 byte)",
			fileName:    "foto.png",
			contentType: "image/png",
			data:        oversizedData,
			expectedExt: "",
			expectedErr: ErrFileTooLarge,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			ext, err := ValidateAvatar(tt.fileName, tt.contentType, tt.data)
			if tt.expectedErr != nil {
				if err == nil {
					t.Fatalf("expected error %v, got nil", tt.expectedErr)
				}
				if !errors.Is(err, tt.expectedErr) && err.Error() != tt.expectedErr.Error() {
					t.Fatalf("expected error '%v', got '%v'", tt.expectedErr, err)
				}
			} else {
				if err != nil {
					t.Fatalf("unexpected error: %v", err)
				}
				if ext != tt.expectedExt {
					t.Fatalf("expected extension '%s', got '%s'", tt.expectedExt, ext)
				}
			}
		})
	}
}

