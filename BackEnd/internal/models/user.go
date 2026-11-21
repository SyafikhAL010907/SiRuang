package models

import "github.com/dgrijalva/jwt-go"

const (
	RoleAdmin    = "admin"
	RoleAdminDev = "admin_dev"
	RoleAdminSFD = "admin_sfd"
	RoleAdminLE  = "admin_le"
	RoleAdminLS  = "admin_ls"
	RoleDosen    = "dosen"
	RolePJKelas  = "pj_kelas"
	RoleUser     = "user"
)

var AllAdminRoles = []string{RoleAdmin, RoleAdminDev, RoleAdminSFD, RoleAdminLE, RoleAdminLS}
var AdminDevRoles = []string{RoleAdmin, RoleAdminDev}
var BuildingAdminRoles = []string{RoleAdminSFD, RoleAdminLE, RoleAdminLS}

func IsAnyAdmin(role string) bool {
	for _, r := range AllAdminRoles {
		if role == r {
			return true
		}
	}
	return false
}

func IsAdminDev(role string) bool {
	return role == RoleAdmin || role == RoleAdminDev
}

func IsBuildingAdmin(role string) bool {
	return role == RoleAdminSFD || role == RoleAdminLE || role == RoleAdminLS
}

type User struct {
	ID             int    `json:"id"`
	Username       string `json:"username"`
	Identifier     string `json:"identifier"`
	IdentifierType string `json:"identifier_type"`
	Password       string `json:"password"`
	Role           string `json:"role"`
	CreatedAt      string `json:"created_at"`
}

type Claims struct {
	UserID         int    `json:"user_id,omitempty"`
	Identifier     string `json:"identifier"`
	IdentifierType string `json:"identifier_type"`
	Role           string `json:"role"`
	Username       string `json:"username"`
	jwt.StandardClaims
}

