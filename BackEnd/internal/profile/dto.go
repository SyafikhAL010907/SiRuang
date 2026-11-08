package profile

// ProfileResponse merepresentasikan payload JSON respon data profile user.
type ProfileResponse struct {
	UserID          int    `json:"userId"`
	Username        string `json:"username"`
	Identifier      string `json:"identifier"`
	IdentifierType  string `json:"identifierType"`
	Role            string `json:"role"`
	FullName        string `json:"fullName"`
	Email           string `json:"email"`
	Phone           string `json:"phone"`
	Whatsapp        string `json:"whatsapp"`
	Faculty         string `json:"faculty"`
	AvatarURL       string `json:"avatarUrl"`
	IsDefaultAvatar bool   `json:"isDefaultAvatar"`
}

// UpdateProfileRequest adalah payload input saat user memperbarui profil.
// Catatan: field avatarUrl, identifier, identifierType, role, dan userId diabaikan jika dikirim oleh client.
type UpdateProfileRequest struct {
	FullName string `json:"fullName"`
	Email    string `json:"email"`
	Phone    string `json:"phone"`
	Whatsapp string `json:"whatsapp"`
	Faculty  string `json:"faculty"`
}

// AvatarResponse adalah payload respon setelah upload avatar berhasil.
type AvatarResponse struct {
	AvatarURL string `json:"avatarUrl"`
	Message   string `json:"message"`
}

