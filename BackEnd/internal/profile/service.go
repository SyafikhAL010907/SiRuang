package profile

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"log"
	"net/mail"
	"regexp"
	"strings"
	"unicode"

	"helpdesk-backend/internal/fileguard"
	"helpdesk-backend/internal/storage"
)

var (
	whatsappRegex = regexp.MustCompile(`^62[0-9]{8,13}$`)
)

type Service interface {
	GetProfile(ctx context.Context, userID int) (*ProfileResponse, error)
	UpdateProfile(ctx context.Context, userID int, req *UpdateProfileRequest) (*ProfileResponse, error)
	UploadAvatar(ctx context.Context, userID int, fileName, contentType string, data []byte) (*AvatarResponse, error)
	DeleteAvatar(ctx context.Context, userID int) (*ProfileResponse, error)
}

type profileService struct {
	repo    Repository
	storage *storage.SupabaseStorage
}

func NewService(repo Repository, storageClient *storage.SupabaseStorage) Service {
	return &profileService{
		repo:    repo,
		storage: storageClient,
	}
}

func (s *profileService) GetProfile(ctx context.Context, userID int) (*ProfileResponse, error) {
	return s.repo.GetProfile(ctx, userID)
}

func (s *profileService) UpdateProfile(ctx context.Context, userID int, req *UpdateProfileRequest) (*ProfileResponse, error) {
	// 1. Trim semua input
	req.FullName = strings.TrimSpace(req.FullName)
	req.Email = strings.TrimSpace(req.Email)
	req.Phone = strings.TrimSpace(req.Phone)
	req.Whatsapp = strings.TrimSpace(req.Whatsapp)
	req.Faculty = strings.TrimSpace(req.Faculty)

	// 2. Validasi FullName: 1-150 karakter
	if len(req.FullName) == 0 || len(req.FullName) > 150 {
		return nil, errors.New("Nama lengkap wajib diisi (maksimal 150 karakter).")
	}

	// 3. Validasi Email: format valid via net/mail, maks 150 karakter
	if req.Email != "" {
		if len(req.Email) > 150 {
			return nil, errors.New("Email terlalu panjang (maksimal 150 karakter).")
		}
		if _, err := mail.ParseAddress(req.Email); err != nil || !strings.Contains(req.Email, "@") || !strings.Contains(req.Email, ".") {
			return nil, errors.New("Format email tidak valid.")
		}
	}

	// 4. Validasi Phone: hanya digit, +, spasi, -, maks 20 karakter
	if req.Phone != "" {
		if len(req.Phone) > 20 {
			return nil, errors.New("Nomor telepon terlalu panjang (maksimal 20 karakter).")
		}
		for _, r := range req.Phone {
			if !unicode.IsDigit(r) && r != '+' && r != ' ' && r != '-' {
				return nil, errors.New("Format nomor telepon tidak valid. Hanya diperbolehkan digit, +, spasi, dan strip.")
			}
		}
	}

	// 5. Validasi Faculty: maks 150 karakter
	if len(req.Faculty) > 150 {
		return nil, errors.New("Nama fakultas terlalu panjang (maksimal 150 karakter).")
	}

	// 6. Normalisasi WhatsApp
	if req.Whatsapp != "" {
		// Buang semua non-digit
		var digits strings.Builder
		for _, r := range req.Whatsapp {
			if unicode.IsDigit(r) {
				digits.WriteRune(r)
			}
		}
		cleanWA := digits.String()

		// Normalisasi awalan:
		// - jika diawali 0: ganti 0 dengan 62
		// - jika diawali 8: tambahkan 62 di depan
		// - jika diawali 62: biarkan
		if strings.HasPrefix(cleanWA, "0") {
			cleanWA = "62" + cleanWA[1:]
		} else if strings.HasPrefix(cleanWA, "8") {
			cleanWA = "62" + cleanWA
		}

		if !whatsappRegex.MatchString(cleanWA) {
			return nil, errors.New("Format nomor WhatsApp tidak valid. Gunakan format yang valid, misalnya 08123456789 atau 628123456789.")
		}
		req.Whatsapp = cleanWA
	}

	// 7. Simpan ke database via repository
	if err := s.repo.UpsertProfile(ctx, userID, req); err != nil {
		return nil, err
	}

	// 8. Ambil data profil terbaru untuk respon
	return s.repo.GetProfile(ctx, userID)
}

func (s *profileService) UploadAvatar(ctx context.Context, userID int, fileName, contentType string, data []byte) (*AvatarResponse, error) {
	// 1. Validasi keamanan avatar murni via fileguard
	canonicalExt, err := fileguard.ValidateAvatar(fileName, contentType, data)
	if err != nil {
		return nil, err
	}

	// 2. Buat random hex 16 byte dari crypto/rand
	randBytes := make([]byte, 16)
	if _, err := rand.Read(randBytes); err != nil {
		return nil, fmt.Errorf("gagal menghasilkan identifier unik file: %w", err)
	}
	randomHex := hex.EncodeToString(randBytes)

	// Simpan dengan path: {userId}/{random}.{png|jpg}
	storagePath := fmt.Sprintf("%d/%s.%s", userID, randomHex, canonicalExt)

	// Tentukan mime type sesuai canonical extension
	mimeType := "image/png"
	if canonicalExt == "jpg" {
		mimeType = "image/jpeg"
	}

	// 3. Ambil avatar_url lama untuk dihapus jika upload sukses nanti
	oldAvatarURL, err := s.repo.GetRawAvatarURL(ctx, userID)
	if err != nil {
		log.Printf("[WARN] Gagal mendapatkan URL avatar lama user %d: %v", userID, err)
	}

	// 4. Upload ke Supabase Storage via REST
	publicURL, err := s.storage.UploadAvatar(ctx, storagePath, data, mimeType)
	if err != nil {
		return nil, fmt.Errorf("gagal mengunggah foto profil ke storage: %w", err)
	}

	// 5. Update kolom avatar_url di database
	if err := s.repo.UpdateAvatarURL(ctx, userID, &publicURL); err != nil {
		// Rollback: hapus file yang baru saja diupload ke storage
		if delErr := s.storage.DeleteAvatar(ctx, storagePath); delErr != nil {
			log.Printf("[ERROR] Rollback gagal menghapus file %s: %v", storagePath, delErr)
		}
		return nil, fmt.Errorf("gagal memperbarui database: %w", err)
	}

	// 6. Hapus avatar lama milik user itu dari storage jika ada
	if oldAvatarURL != nil && *oldAvatarURL != "" {
		go func(oldURL string) {
			bgCtx, cancel := context.WithTimeout(context.Background(), 20)
			defer cancel()
			if delErr := s.storage.DeleteAvatar(bgCtx, oldURL); delErr != nil {
				log.Printf("[WARN] Gagal menghapus avatar lama (%s): %v", oldURL, delErr)
			}
		}(*oldAvatarURL)
	}

	return &AvatarResponse{
		AvatarURL: publicURL,
		Message:   "Foto profil berhasil diperbarui",
	}, nil
}

func (s *profileService) DeleteAvatar(ctx context.Context, userID int) (*ProfileResponse, error) {
	// 1. Ambil URL avatar lama
	oldAvatarURL, err := s.repo.GetRawAvatarURL(ctx, userID)
	if err != nil {
		log.Printf("[WARN] Gagal cek avatar lama user %d: %v", userID, err)
	}

	// 2. Set avatar_url = NULL di database
	if err := s.repo.UpdateAvatarURL(ctx, userID, nil); err != nil {
		return nil, fmt.Errorf("gagal mereset foto profil di database: %w", err)
	}

	// 3. Hapus file lama di storage
	if oldAvatarURL != nil && *oldAvatarURL != "" {
		go func(oldURL string) {
			bgCtx, cancel := context.WithTimeout(context.Background(), 20)
			defer cancel()
			if delErr := s.storage.DeleteAvatar(bgCtx, oldURL); delErr != nil {
				log.Printf("[WARN] Gagal menghapus avatar lama (%s): %v", oldURL, delErr)
			}
		}(*oldAvatarURL)
	}

	// 4. Kembalikan data profile (view v_user_profiles otomatis mengembalikan /LogoSiRuangPolos.png)
	return s.repo.GetProfile(ctx, userID)
}

