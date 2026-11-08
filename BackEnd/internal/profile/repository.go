package profile

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
)

type Repository interface {
	GetProfile(ctx context.Context, userID int) (*ProfileResponse, error)
	UpsertProfile(ctx context.Context, userID int, req *UpdateProfileRequest) error
	GetRawAvatarURL(ctx context.Context, userID int) (*string, error)
	UpdateAvatarURL(ctx context.Context, userID int, avatarURL *string) error
}

type postgresRepository struct {
	db *sql.DB
}

func NewRepository(db *sql.DB) Repository {
	return &postgresRepository{db: db}
}

// GetProfile mengambil data profil lengkap dari database view v_user_profiles.
func (r *postgresRepository) GetProfile(ctx context.Context, userID int) (*ProfileResponse, error) {
	query := `
		SELECT 
			user_id, 
			username, 
			identifier, 
			identifier_type, 
			role, 
			COALESCE(full_name, ''), 
			COALESCE(email, ''), 
			COALESCE(phone, ''), 
			COALESCE(whatsapp, ''), 
			COALESCE(faculty, ''), 
			COALESCE(avatar_url, '/LogoSiRuangPolos.png'), 
			COALESCE(is_default_avatar, true)
		FROM v_user_profiles
		WHERE user_id = $1
	`

	var p ProfileResponse
	err := r.db.QueryRowContext(ctx, query, userID).Scan(
		&p.UserID,
		&p.Username,
		&p.Identifier,
		&p.IdentifierType,
		&p.Role,
		&p.FullName,
		&p.Email,
		&p.Phone,
		&p.Whatsapp,
		&p.Faculty,
		&p.AvatarURL,
		&p.IsDefaultAvatar,
	)

	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("user tidak ditemukan")
		}
		return nil, fmt.Errorf("gagal query profil: %w", err)
	}

	return &p, nil
}

// UpsertProfile melakukan insert atau update field profil user ke tabel profiles.
func (r *postgresRepository) UpsertProfile(ctx context.Context, userID int, req *UpdateProfileRequest) error {
	query := `
		INSERT INTO profiles (user_id, full_name, email, phone, whatsapp, faculty, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW())
		ON CONFLICT (user_id) DO UPDATE SET
			full_name  = EXCLUDED.full_name,
			email      = EXCLUDED.email,
			phone      = EXCLUDED.phone,
			whatsapp   = EXCLUDED.whatsapp,
			faculty    = EXCLUDED.faculty,
			updated_at = NOW()
	`

	_, err := r.db.ExecContext(ctx, query, userID, req.FullName, req.Email, req.Phone, req.Whatsapp, req.Faculty)
	if err != nil {
		return fmt.Errorf("gagal menyimpan profil: %w", err)
	}
	return nil
}

// GetRawAvatarURL mengambil nilai avatar_url aktual langsung dari tabel profiles.
// Mengembalikan nil jika user belum memiliki baris profil atau avatar_url NULL.
func (r *postgresRepository) GetRawAvatarURL(ctx context.Context, userID int) (*string, error) {
	query := `SELECT avatar_url FROM profiles WHERE user_id = $1`
	var avatarURL sql.NullString
	err := r.db.QueryRowContext(ctx, query, userID).Scan(&avatarURL)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, fmt.Errorf("gagal memeriksa avatar lama: %w", err)
	}

	if !avatarURL.Valid {
		return nil, nil
	}
	val := avatarURL.String
	return &val, nil
}

// UpdateAvatarURL mengupdate kolom avatar_url pada tabel profiles.
// Jika avatarURL == nil, kolom di-set ke NULL (reset ke default).
func (r *postgresRepository) UpdateAvatarURL(ctx context.Context, userID int, avatarURL *string) error {
	query := `
		INSERT INTO profiles (user_id, avatar_url, updated_at)
		VALUES ($1, $2, NOW())
		ON CONFLICT (user_id) DO UPDATE SET
			avatar_url = EXCLUDED.avatar_url,
			updated_at = NOW()
	`

	var val interface{}
	if avatarURL != nil {
		val = *avatarURL
	} else {
		val = nil
	}

	_, err := r.db.ExecContext(ctx, query, userID, val)
	if err != nil {
		return fmt.Errorf("gagal update avatar: %w", err)
	}
	return nil
}

