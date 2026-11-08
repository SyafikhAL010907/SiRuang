package storage

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"os"
	"strings"
	"time"
)

type SupabaseStorage struct {
	baseURL        string
	serviceRoleKey string
	bucket         string
	httpClient     *http.Client
}

// NewSupabaseStorage membuat instance client Supabase Storage REST.
// Jika parameter kosong, membaca dari environment variable.
func NewSupabaseStorage() *SupabaseStorage {
	baseURL := os.Getenv("SUPABASE_URL")
	if baseURL == "" {
		baseURL = os.Getenv("NEXT_PUBLIC_SUPABASE_URL")
	}
	baseURL = strings.TrimRight(baseURL, "/")

	key := os.Getenv("SUPABASE_SERVICE_ROLE_KEY")

	bucket := os.Getenv("SUPABASE_STORAGE_BUCKET")
	if bucket == "" {
		bucket = "avatars"
	}

	return &SupabaseStorage{
		baseURL:        baseURL,
		serviceRoleKey: key,
		bucket:         bucket,
		httpClient: &http.Client{
			Timeout: 20 * time.Second,
		},
	}
}

// UploadAvatar mengunggah byte gambar ke Supabase Storage pada path tertentu.
// Path contoh: "{userId}/{randomHex}.{ext}"
// Mengembalikan URL publik gambar.
func (s *SupabaseStorage) UploadAvatar(ctx context.Context, relativePath string, data []byte, contentType string) (string, error) {
	if s.baseURL == "" || s.serviceRoleKey == "" {
		return "", fmt.Errorf("supabase storage credentials belum dikonfigurasi (SUPABASE_URL atau SUPABASE_SERVICE_ROLE_KEY kosong)")
	}

	cleanPath := strings.TrimPrefix(relativePath, "/")
	reqURL := fmt.Sprintf("%s/storage/v1/object/%s/%s", s.baseURL, s.bucket, cleanPath)

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, reqURL, bytes.NewReader(data))
	if err != nil {
		return "", fmt.Errorf("gagal membuat request upload: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+s.serviceRoleKey)
	req.Header.Set("apikey", s.serviceRoleKey)
	req.Header.Set("Content-Type", contentType)
	req.Header.Set("x-upsert", "true")

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("gagal menghubungi storage supabase: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return "", fmt.Errorf("supabase storage upload error (HTTP %d): %s", resp.StatusCode, string(bodyBytes))
	}

	publicURL := fmt.Sprintf("%s/storage/v1/object/public/%s/%s", s.baseURL, s.bucket, cleanPath)
	return publicURL, nil
}

// DeleteAvatar menghapus file avatar dari Supabase Storage berdasarkan URL atau relative path.
// Jika avatarURL adalah aset default /LogoSiRuangPolos.png atau kosong, fungsi ini tidak melakukan apa-apa.
func (s *SupabaseStorage) DeleteAvatar(ctx context.Context, avatarURL string) error {
	trimmed := strings.TrimSpace(avatarURL)
	if trimmed == "" || trimmed == "/LogoSiRuangPolos.png" {
		return nil
	}

	if s.baseURL == "" || s.serviceRoleKey == "" {
		return nil // Abaikan jika credentials belum diisi
	}

	// Ekstrak relative path dari URL publik jika berupa full URL
	// Contoh: https://xyz.supabase.co/storage/v1/object/public/avatars/1/abcdef.jpg -> 1/abcdef.jpg
	targetPath := trimmed
	prefix := fmt.Sprintf("%s/storage/v1/object/public/%s/", s.baseURL, s.bucket)
	if strings.HasPrefix(targetPath, prefix) {
		targetPath = strings.TrimPrefix(targetPath, prefix)
	} else if u, err := url.Parse(trimmed); err == nil && u.Path != "" {
		bucketPrefix := fmt.Sprintf("/storage/v1/object/public/%s/", s.bucket)
		if strings.HasPrefix(u.Path, bucketPrefix) {
			targetPath = strings.TrimPrefix(u.Path, bucketPrefix)
		}
	}

	targetPath = strings.TrimPrefix(targetPath, "/")
	if targetPath == "" || strings.HasPrefix(targetPath, "http") {
		// Bukan path storage milik bucket ini, lewati
		return nil
	}

	reqURL := fmt.Sprintf("%s/storage/v1/object/%s/%s", s.baseURL, s.bucket, targetPath)
	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, reqURL, nil)
	if err != nil {
		return fmt.Errorf("gagal membuat request delete: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+s.serviceRoleKey)
	req.Header.Set("apikey", s.serviceRoleKey)

	resp, err := s.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("gagal menghubungi storage supabase saat delete: %w", err)
	}
	defer resp.Body.Close()

	// 200 OK atau 404 (sudah terhapus) dianggap sukses
	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNotFound && resp.StatusCode != http.StatusNoContent {
		bodyBytes, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("supabase storage delete error (HTTP %d): %s", resp.StatusCode, string(bodyBytes))
	}

	return nil
}

