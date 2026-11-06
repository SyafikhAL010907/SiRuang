package main
import (
	"fmt"
	"golang.org/x/crypto/bcrypt"
)
func main() {
	hash, _ := bcrypt.GenerateFromPassword([]byte("AdminDev1"), 14)
	fmt.Println(string(hash))
}
