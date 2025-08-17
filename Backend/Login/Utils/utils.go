package Utils

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"login/Consts"
	"login/Type"
	"net/http"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"golang.org/x/crypto/bcrypt"
)

func WriteJsonSuccess(w http.ResponseWriter, statusCode int, payload Type.Payload) error {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	if err := json.NewEncoder(w).Encode(Type.Response{Type:"Success", Payload: payload}); err != nil {
		return err
	}
	return nil 
}
func WriteJsonError(w http.ResponseWriter, statusCode int, payload Type.Payload) error {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	if err := json.NewEncoder(w).Encode(Type.Response{Type:"Error", Payload: payload}); err != nil {
		return err
	}
	return nil 
}
func WriteJsonLogout(w http.ResponseWriter, statusCode int, payload Type.Payload) error {
	w.Header().Add("Content-Type", "application/json")
	w.WriteHeader(statusCode)
	if err := json.NewEncoder(w).Encode(Type.Response{Type:"Logout", Payload: payload}); err != nil {
		return err
	}
	return nil 
}

func ValidateInput(input string, rules ...Type.ValidationRule) (bool, string) {
	for _, rule := range rules {
		if rule.Rule != nil && !rule.Rule.MatchString(input) {
			return false, rule.ErrorMsg
		}
		if rule.Func != nil && !rule.Func(input) {
			return false, rule.ErrorMsg
		}
	}
	return true, ""
}

// GenerateUUID generates a random UUID (version 4).
func GenerateUUID() string {
	return uuid.New().String()
}

func GetToday() string {
	today := time.Now()
	formatted := today.Format("2006/01/02")
	return formatted
}

func WithTransaction(db *mongo.Database, callback func(mongo.SessionContext) (error)) error {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	session, err := db.Client().StartSession()
	if err != nil {
		return fmt.Errorf("failed to start session: %w", err)
	}
	defer session.EndSession(ctx)

	// Wrap the user's logic in the MongoDB transaction function
	_, err = session.WithTransaction(ctx, func(sc mongo.SessionContext) (interface{}, error) {
		if err := callback(sc); err != nil {
			return nil, err
		}
		return nil, nil
	})

	return err
}

func GetUserByID(DB *mongo.Database, userID string) (*Type.User, error) {
	var user Type.User
	findCtx, cancel := context.WithTimeout(context.Background(), time.Second*5)
	defer cancel()

	err := DB.Collection("Users").FindOne(findCtx, bson.M{"id":userID}).Decode(&user)
	if err != nil {
		return nil, err
	}

	return &user, nil
}

func GetUserByAccount(DB *mongo.Database, account string) (*Type.User, error) {
	var user Type.User
	findCtx, cancel := context.WithTimeout(context.Background(), time.Second*5)
	defer cancel()

	err := DB.Collection("Users").FindOne(findCtx, bson.M{"account":account}).Decode(&user)
	if err != nil {
		return nil, err
	}

	return &user, nil
}

func LogError(title string, errorMsg string) {
	fmt.Printf("%s: %s\n", title, errorMsg)
}

// HashPassword generates a bcrypt hash of the password
func HashPassword(password string) (string, error) {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		log.Println("hashing password error", err.Error())
		return "", err
	}
	return string(hashedPassword), nil
}

func CheckHashedPassword(plainPassword, hashedPassword string) bool {
	err := bcrypt.CompareHashAndPassword([]byte(hashedPassword), []byte(plainPassword))
	return err == nil
}

func SignJWT(userID string, expireTime time.Time) (string , error) {
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"userID": userID,
		// 7 days before expiring
		"expire": expireTime.Unix(),
	})
	
	// Sign and get the complete encoded token as a string using the secret
	secret := os.Getenv("JWTSecret")
	tokenString, err := token.SignedString([]byte(secret))
	if err != nil {
		return "", err
	}

	return tokenString, nil
}

func SetJTWCookie(w http.ResponseWriter, tokenString string, expireTime time.Time) {
	http.SetCookie(w, &http.Cookie{
		Name:     Consts.CookieName,
		// no scheme or port included, only domain
		Domain:   Consts.DOMAIN, 
		Value:    tokenString,
		Path:     "/",
		// Prevents JavaScript access (protects against XSS)
		HttpOnly: true,  
		// Ensures cookie is only sent over HTTPS;
		Secure:   true,  
		// 如果是strict mode就能Prevents CSRF attacks，但用CORS去檔也可以; 
		// none for test but the secure needs to be true in order to make browser happy
		SameSite: http.SameSiteNoneMode, 
		Expires:  expireTime,
	})
}

func GetJWTCookie(r *http.Request) (string, error) {
	cookie, err := r.Cookie(Consts.CookieName)
	if err != nil {
		return "", nil
	}
	return cookie.Value, nil
}

func RemoveJWTCookie(w http.ResponseWriter) {
	http.SetCookie(w, &http.Cookie{
		Name:     Consts.CookieName,
		Domain:   Consts.DOMAIN,
		// Empty value
		Value:    "",                   
		// Must match original cookie path
		Path:     "/",                  
		HttpOnly: true,
		// Ensures cookie is only sent over HTTPS;
		Secure:   true,
		// 如果是strict mode就能Prevents CSRF attacks，但用CORS去檔也可以; 
		// none for test but the secure needs to be true in order to make browser happy
		SameSite: http.SameSiteNoneMode, 
		// Expired timestamp
		Expires:  time.Unix(0, 0),    
		// Forces deletion  
		MaxAge:   -1,                   
	})
}

func IsValidJWT(tokenString string) (*jwt.Token, error) {
	token, err := jwt.Parse(tokenString, func(token *jwt.Token) (interface{}, error) {
		// Don't forget to validate the alg is what you expect:
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
	
		// it is a []byte containing your secret, e.g. []byte("my_secret_key")
		return []byte(os.Getenv("JWTSecret")), nil
	})
	if err != nil {
		return nil, err
	}
	
	// check if JWT token is expired
	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return nil, fmt.Errorf("JWT claims failed")
	}
	// 確認expire是存在的field(這步驟是保險起見，要使用任何解構JWT後的json欄位都要檢查)
	expireTime, ok := claims["expire"].(float64)
        if !ok {
            return nil, fmt.Errorf("無效的欄位")
        }
	if expireTime < float64(time.Now().Unix()) {
		return nil, fmt.Errorf("JWT token is expired")
	}
	// 檢查是否有userID的欄位
	_, ok = claims["userID"].(string)
        if !ok {
            return nil, fmt.Errorf("無效的欄位")
        }

	return token, nil
}
