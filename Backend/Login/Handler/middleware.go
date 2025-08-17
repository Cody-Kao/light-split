package Handler

import (
	"fmt"
	"log"
	"login/Consts"
	"login/Type"
	"login/Utils"
	"net"
	"net/http"
	"os"
	"slices"
	"strings"
	"sync"

	"golang.org/x/time/rate"
)

func getIP(r *http.Request) string {
    xff := r.Header.Get("X-Forwarded-For")
    if xff != "" {
        ips := strings.Split(xff, ",")
        return strings.TrimSpace(ips[0])
    }
    // fallback to RemoteAddr (will be Lambda internal IP)
    host, _, _ := net.SplitHostPort(r.RemoteAddr)
    return host
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
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        allowedOrigin := os.Getenv("Light_Split_FrontendPATH")
        if allowedOrigin == "" {
            allowedOrigin = "http://localhost:5173"
        }
        allowedOrigins := strings.Fields(allowedOrigin) // handles spaces + trims

        origin := r.Header.Get("Origin")
		if (origin == "") {
			origin = r.Header.Get("origin")
		}
        if slices.Contains(allowedOrigins, origin) {
            w.Header().Set("Access-Control-Allow-Origin", origin)
            w.Header().Set("Access-Control-Allow-Credentials", "true")
            w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
            w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-Requested-With")

            if r.Method == "OPTIONS" {
                w.WriteHeader(http.StatusNoContent) // let preflight pass
                return
            }

            next.ServeHTTP(w, r)
            return
        }

        Utils.WriteJsonError(w, http.StatusForbidden, Type.Payload{
            Message: fmt.Sprintf("%s CORS violated", origin),
        })
    })
}
// 用sync map儲存ip對應limiter
var limiterIPMap sync.Map

// API rate limiter
func RateLimit(next http.Handler) http.Handler {
	return http.HandlerFunc(func (w http.ResponseWriter, r *http.Request) {
		IP := getIP(r)
		if IP == "" {
			Utils.WriteJsonError(w, http.StatusBadRequest ,Type.Payload{Message: "取得IP為空"})
			log.Println("取得IP為空")
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