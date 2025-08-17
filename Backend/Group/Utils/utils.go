package Utils

import (
	"context"
	"encoding/json"
	"fmt"
	"group/Consts"
	"group/Type"
	"net/http"
	"os"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

func WriteJsonSuccess(w http.ResponseWriter, statusCode int, payload Type.Payload) error {
	w.Header().Add("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(Type.Response{Type:"Success", Payload: payload}); err != nil {
		return err
	}
	return nil 
}
func WriteJsonError(w http.ResponseWriter, statusCode int, payload Type.Payload) error {
	w.Header().Add("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(Type.Response{Type:"Error", Payload: payload}); err != nil {
		return err
	}
	return nil 
}
func WriteJsonLogout(w http.ResponseWriter, statusCode int, payload Type.Payload) error {
	w.Header().Add("Content-Type", "application/json")
	if err := json.NewEncoder(w).Encode(Type.Response{Type:"Logout", Payload: payload}); err != nil {
		return err
	}
	return nil 
}

func CheckLogIn(w http.ResponseWriter, r *http.Request) {}

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

/*
更好的transaction wrapper(支援自定義錯誤回傳訊息)
func WithTransaction(db *mongo.Database, callback func(mongo.SessionContext) (string, error)) (interface{}, error) {
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	session, err := db.Client().StartSession()
	if err != nil {
		return "", fmt.Errorf("failed to start session: %w", err)
	}
	defer session.EndSession(ctx)

	// Wrap the user's logic in the MongoDB transaction function
	msg, err := session.WithTransaction(ctx, func(sc mongo.SessionContext) (interface{}, error) {
		if msg, err := callback(sc); err != nil {
			return msg, err
		}
		return "操作成功", nil
	})

	return msg, err
}
*/

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
func GetGroupByID(DB *mongo.Database, groupID string) (*Type.Group, error) {
	var group Type.Group
	findCtx, cancel := context.WithTimeout(context.Background(), time.Second*5)
	defer cancel()

	err := DB.Collection("Groups").FindOne(findCtx, bson.M{"id":groupID}).Decode(&group)
	if err != nil {
		return nil, err
	}

	return &group, nil
}

func GetJWTCookie(r *http.Request) (string, error) {
	cookie, err := r.Cookie(Consts.CookieName)
	if err != nil {
		return "", nil
	}
	return cookie.Value, nil
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

func GetPaginatedData[T any](
	collection *mongo.Collection,
	filter interface{},
	sortField string,  // e.g., "editedAt"
	sortOrder int,     // 1 for ascending, -1 for descending
	skip int64,
	limit int64,
) ([]T, error) {
	ctx, cancel := context.WithTimeout(context.Background(), time.Second*10)
	defer cancel()

	findOpts := options.Find().
		SetSort(bson.D{{Key: sortField, Value: sortOrder},
			// "_id" make it stable when the first sort field's values are the same
			{Key: "_id", Value: sortOrder},}). 
		SetSkip(skip).
		SetLimit(limit)

	cursor, err := collection.Find(ctx, filter, findOpts)
	if err != nil {
		return nil, err
	}
	defer cursor.Close(ctx)

	// Decode to generic result
	var data []T
	if err := cursor.All(ctx, &data); err != nil {
		return nil, err
	}

	return data, nil
}
