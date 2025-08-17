package Consts

import (
	"expense/Type"
	"os"
	"regexp"
	"time"

	"golang.org/x/time/rate"
)

const ContextKey Type.ContextKeyType = "userID"
const ImageFileContextKey Type.ContextKeyType = "imageFile"
const ImageHeaderContextKey Type.ContextKeyType = "imageHeader"
const ImageMIMETypeContextKey Type.ContextKeyType = "imageMIMEType"

var (
	PORT = os.Getenv("PORT")
	MongoDB_uri = os.Getenv("mongoDB_uri")
	DefaultJWTExpireTime = time.Now().Add(time.Hour * 24 * 7)
	APILimit rate.Limit = 35;
	APIBurst = 40
	JWTClientID = os.Getenv("JWTClientID")
	QueryLimit = int64(5)
	Currency = []string{"台幣", "美金", "日幣"}
	CookieName = "Light-Split-JWT"
	FormLimitSize = 3 << 20 // 3MB
	MaxFormLimitSize = 5 << 20 // 5MB => the limit that would directly shut down connection with frontend
	AllowedFileType = []string{"image/jpeg", "image/png"}
	// Map MIME types to extensions
	MimeExtMap = map[string]string{
		"image/jpg": ".jpg", // this is not a standard MIME type, but just in case that frontend do something wrong
		"image/jpeg": ".jpg",
		"image/png":  ".png",
	}

	// for R2
	R2AccessKeyID     = os.Getenv("R2AccessKeyID")
	R2SecretAccessKey = os.Getenv("R2SecretAccessKey")
	R2S3APIEndpoint   = os.Getenv("R2S3APIEndpoint")
	R2Region          = "auto" // Cloudflare R2 uses "auto"
	R2Bucket          = "light-split" // name of bucket
	// make bucket to be publicly accessed; then use public domain name
	PublicBaseURL     = os.Getenv("R2-light-split-public-URL")
)

// Precompiled regex rules
func MustContainNumberLowerUpperCaseRule(s string) bool {
	hasLower := regexp.MustCompile(`[a-z]`).MatchString(s)
	hasUpper := regexp.MustCompile(`[A-Z]`).MatchString(s)
	hasDigit := regexp.MustCompile(`[0-9]`).MatchString(s)

	return hasLower && hasUpper && hasDigit
}

var (
	NonEmpty = Type.ValidationRule{
		Rule:     regexp.MustCompile(`^.*[^\s].*$`),  // At least one non-whitespace character
		ErrorMsg: "不得為空",
	}

	OnlyAlphanumericChineseAndSpace = Type.ValidationRule{
		Rule:     regexp.MustCompile(`^[\p{Han}a-zA-Z0-9\s]+$`),
		ErrorMsg: "只能含有數字、英文、中文字符與空白",
	}

	MustContainNumberLowerUpperCase = Type.ValidationRule{
		Rule:     nil,
		Func: 	  MustContainNumberLowerUpperCaseRule,
		ErrorMsg: "必須包含至少一個小寫英文、一個大寫英文與一個數字",
	}
	PositiveNumberOnly = Type.ValidationRule{
		Rule:     regexp.MustCompile(`^(0|[1-9]\d*)(\.\d+)?$`),
		ErrorMsg: "只能輸入正數，且不得為負數或非數字",
	}
	NonSpecialCharacter = Type.ValidationRule{
		Rule:     regexp.MustCompile(`^[^!@#$%^&*(),.?":{}|<>]+$`),
		ErrorMsg: "不得包含特殊字元(! @ # $ %...)",
	}
	LessThan20Words = Type.ValidationRule{
		Rule:     regexp.MustCompile(`^.{0,20}$`),
		ErrorMsg: "不得超過20個字元",
	}
	LessThan10Words = Type.ValidationRule{
		Rule:     regexp.MustCompile(`^.{0,10}$`),
		ErrorMsg: "不得超過10個字元",
	}
	LessThan350Words = Type.ValidationRule{
		Rule:     regexp.MustCompile(`^.{0,350}$`),
		ErrorMsg: "不得超過350個字元",
	}
)

