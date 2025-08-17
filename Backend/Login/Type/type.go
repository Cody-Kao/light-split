package Type

import (
	"bytes"
	"mime/multipart"
	"regexp"
)

type User struct {
	ID        string `json:"id" bson:"id" validate:"required"`
	Name      string `json:"name" bson:"name" validate:"required"`
	CreatedAt string `json:"createdAt" bson:"createdAt"`
	Account   string `json:"account" bson:"account" validate:"required"`
	Password  string `json:"password" bson:"password" validate:"required"`
	Image     string `json:"image" bson:"image"`
	IsGoogle  bool   `json:"isGoogle" bson:"isGoogle"`
	Groups 	  []string `json:"groups" bson:"groups"`
}

type ValidationRule struct {
	Rule     *regexp.Regexp
	Func 	 func(string) bool
	ErrorMsg string
}

type ImageData struct {
	File    *bytes.Buffer
	Header  *multipart.FileHeader
	MIMEType string
}
