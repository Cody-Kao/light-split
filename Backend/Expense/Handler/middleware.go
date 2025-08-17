package Handler

import (
	"context"
	"expense/Consts"
	"expense/Type"
	"expense/Utils"
	"fmt"
	"log"
	"net"
	"net/http"
	"os"
	"slices"
	"strings"
	"sync"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/time/rate"
)

func getIP(r *http.Request) (string, error) {
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err != nil {
		return "", err
	}
	return host, nil
}

// http.HandlerFunc is also implemented the interface the http.Handler
// and the func (w http.ResponseWriter, r *http.Request) is a form of http.HandlerFunc, but not essentially
type middlewareFunc func(http.Handler) http.Handler

func chainMiddleware(h http.Handler, m ...middlewareFunc) http.Handler {
	for i := len(m) - 1; i >= 0; i-- {
		h = m[i](h)
	}
	return h
}

// 直接包mux讓此middleware變成default
func EnableCORS(next http.Handler) http.Handler {
	// 包http.HandlerFunc()，讓裡面func(w http.ResponseWriter, r *http.Request) AKA HandlerFunc 變http.Handler
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		allowedOrigin := os.Getenv("Light_Split_FrontendPATH") // Change to your frontend URL
		if allowedOrigin == "" {
			allowedOrigin = "http://localhost:5173"
		}
		allowedOrigins := strings.Split(allowedOrigin, " ") // 用空格區分不同origin
		origin := r.Header.Get("Origin")
		fmt.Println(origin)
		if slices.Contains(allowedOrigins, origin) {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
			w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Requested-With")
			w.Header().Set("Access-Control-Allow-Credentials", "true")
		} else {
			Utils.WriteJsonError(w, http.StatusForbidden ,Type.Payload{Message: fmt.Sprintf("%s CORS violated", origin)})
			return
		}
		// Handle preflight requests
		if r.Method == "OPTIONS" {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

// 檢查Cookie以及驗證JWT token，並把userID傳入context裡面給之後的handler
func CheckAndValidateJWT(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		tokenString, err := Utils.GetJWTCookie(r)
		if err != nil {
			Utils.WriteJsonLogout(w, http.StatusBadRequest, Type.Payload{Field: "root", Message: "使用者未登入"})
			return
		}
		token, err := Utils.IsValidJWT(tokenString)
		if err != nil {
			Utils.WriteJsonLogout(w, http.StatusBadRequest, Type.Payload{Field: "root", Message: "Token驗證失敗"})
			return
		}
		claims, _ := token.Claims.(jwt.MapClaims)
		userID, ok := claims["userID"].(string)
		if !ok {
			Utils.WriteJsonLogout(w, http.StatusBadRequest, Type.Payload{Field: "root", Message: "Token缺少重要欄位"})
			return
		}
		
		// 將userID存入context裡面
		ctx := context.WithValue(r.Context(), Consts.ContextKey, userID)

		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// 用sync map儲存ip對應limiter
var limiterIPMap sync.Map

// API rate limiter
func RateLimit(next http.Handler) http.Handler {
	return http.HandlerFunc(func (w http.ResponseWriter, r *http.Request) {
		IP, err := getIP(r)
		if err != nil {
			Utils.WriteJsonError(w, http.StatusBadRequest ,Type.Payload{Message: "IP出錯"})
			log.Println("取得IP出錯", err.Error())
			return
		}
		limiterAny, _ := limiterIPMap.LoadOrStore(IP, rate.NewLimiter(Consts.APILimit, Consts.APIBurst))
		limiter := limiterAny.(*rate.Limiter)

		if !limiter.Allow() {
			Utils.WriteJsonError(w, http.StatusBadRequest ,Type.Payload{Message: "太多請求 請稍後"})
			log.Println("IP", IP, "短時間送出太多請求")
			return
		}
		next.ServeHTTP(w, r)
	})
}