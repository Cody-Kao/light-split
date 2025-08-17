package Consts

import (
	"group/Type"
	"os"
	"regexp"
	"time"

	"golang.org/x/time/rate"
)

const ContextKey Type.ContextKeyType = "userID"

var (
	PORT = os.Getenv("PORT")
	MongoDB_uri = os.Getenv("mongoDB_uri")
	APILimit rate.Limit = 35;
	APIBurst = 40
	JWTClientID = os.Getenv("JWTClientID")
	DefaultJWTExpireTime = time.Now().Add(time.Hour * 24 * 7)
	QueryLimit = int64(5)
	CookieName = "Light-Split-JWT"
	
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
		Func:	  MustContainNumberLowerUpperCaseRule,
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
)

