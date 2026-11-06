package models

type Captcha struct {
	Kode       int    `json:"kode"`
	Pertanyaan string `json:"pertanyaan"`
	Jawaban    string `json:"jawaban"`
}
