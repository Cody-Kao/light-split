package Handler

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"login/Consts"
	"login/DB"
	"login/Type"
	"login/Utils"
	"net/http"
	"time"

	"github.com/go-playground/validator"
	"github.com/golang-jwt/jwt/v5"
	"go.mongodb.org/mongo-driver/mongo"
)

/*

success response
{
	type: "Success",
	payload:{field:"", message:"success", data:"optional, mostly ID"}
}
error response
{
	type: "Error/Logout", // error refers to regular error; logout refers to force user to logout
	payload:{field:"field name", message:"something went wrong", data:""} // the universal field is root; to work with RHF
}

*/

// 用來validate bson field
var validate = validator.New()

func home(w http.ResponseWriter, r *http.Request) {
	fmt.Fprint(w, "Hello World")
}

// generic function wrapper, for validation and decode/encode request and response	
func handle[T any](handler func(http.ResponseWriter, T) (int, Type.Payload)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		var request T
		if err := json.NewDecoder(r.Body).Decode(&request); err != nil {
			fmt.Println("JSON decode error:", err)
			Utils.WriteJsonError(w, http.StatusBadRequest, Type.Payload{Field: "root", Message: "無效的 JSON 請求"})
			return
		}

		if err := validate.Struct(request); err != nil {
			fmt.Println("Validation error:", err)
			Utils.WriteJsonError(w, http.StatusBadRequest, Type.Payload{Field: "root", Message: "欄位格式錯誤"})
			return
		}

		statusCode, payload := handler(w, request)
		if statusCode < 400 {
			if err := Utils.WriteJsonSuccess(w, statusCode, payload); err != nil {
				Utils.WriteJsonError(w, http.StatusInternalServerError, Type.Payload{Message: "回應錯誤"})
			}
		} else {
			if err := Utils.WriteJsonError(w, statusCode, payload); err != nil {
				Utils.WriteJsonError(w, http.StatusInternalServerError, Type.Payload{Message: "伺服器錯誤"})
			}
		}
	}
}

func handleRegister(w http.ResponseWriter, request Type.RegisterRequest) (int, Type.Payload) {
	// 檢查各個欄位是否正確
	if isValid, errorMsg := Utils.ValidateInput(request.Name, Consts.NonEmpty, Consts.LessThan10Words, 
		 Consts.OnlyAlphanumericChineseAndSpace); !isValid {
		return http.StatusBadRequest, Type.Payload{Field: "name", Message: errorMsg}
	}
	if isValid, errorMsg := Utils.ValidateInput(request.Account, Consts.ValidEmail); !isValid {
		return http.StatusBadRequest, Type.Payload{Field: "account", Message: errorMsg}
	}
	if isValid, errorMsg := Utils.ValidateInput(request.Password, Consts.NonEmpty, Consts.AtLeast8Words, 
		Consts.LessThan20Words, Consts.MustContainNumberLowerUpperCase); !isValid {
			return http.StatusBadRequest, Type.Payload{Field: "password", Message: errorMsg}
	}
	if request.Password != request.ConfirmPassword {
		return http.StatusBadRequest, Type.Payload{Field: "confirmPassword", Message: "密碼與確認密碼不一致"}
	}

	// 檢查帳號是否已被註冊
	_, err := Utils.GetUserByAccount(DB.DB, request.Account)
	if err == nil {
		return http.StatusBadRequest, Type.Payload{Field: "account", Message: "該帳號已被註冊"}
	}
	if !errors.Is(err, mongo.ErrNoDocuments) {
		return http.StatusInternalServerError, Type.Payload{Field: "root", Message: "伺服器錯誤"}
	}

	// hash password
	hashedPassword, err := Utils.HashPassword(request.Password)
	if err != nil {
		return http.StatusInternalServerError, Type.Payload{Field: "root", Message: "伺服器錯誤"}
	}
	userID := Utils.GenerateUUID()
	newUser := Type.User{
		ID: userID,
		Name: request.Name,
		Account: request.Account,
		Password: hashedPassword,
		CreatedAt: Utils.GetToday(),
		Groups: make([]string, 0),
	}

	// 儲存使用者
	writeCtx, cancel := context.WithTimeout(context.Background(), time.Second*5)
	defer cancel()
	_, err = DB.DB.Collection("Users").InsertOne(writeCtx, &newUser)
	if err != nil {
		return http.StatusInternalServerError, Type.Payload{Field: "root", Message: "伺服器錯誤"}
	}
	// 發JWT於cookie
	tokenString, err := Utils.SignJWT(userID, Consts.DefaultJWTExpireTime)
	if err != nil {
		return http.StatusInternalServerError, Type.Payload{Field: "root", Message: "伺服器錯誤"}
	}
	// set Cookie
	Utils.SetJTWCookie(w, tokenString, Consts.DefaultJWTExpireTime)

	return http.StatusOK, Type.Payload{Message: "註冊成功", Data: newUser}
}

func handleLogin(w http.ResponseWriter, request Type.LoginRequest) (int, Type.Payload) {
	// 檢查欄位
	if isValid, errorMsg := Utils.ValidateInput(request.Account, Consts.ValidEmail); !isValid {
		return http.StatusBadRequest, Type.Payload{Field: "account", Message: errorMsg}
	}
	if isValid, errorMsg := Utils.ValidateInput(request.Password, Consts.NonEmpty, Consts.AtLeast8Words, 
		Consts.LessThan20Words, Consts.MustContainNumberLowerUpperCase); !isValid {
			return http.StatusBadRequest, Type.Payload{Field: "password", Message: errorMsg}
	}

	user, err := Utils.GetUserByAccount(DB.DB, request.Account)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return http.StatusBadRequest, Type.Payload{Field: "root", Message: "帳號或密碼錯誤"}
		}
		return http.StatusInternalServerError, Type.Payload{Field: "root", Message: "伺服器錯誤"}
	}
	isCorrectPassword := Utils.CheckHashedPassword(request.Password, user.Password)
	if !isCorrectPassword {
		return http.StatusBadRequest, Type.Payload{Field: "root", Message: "帳號或密碼錯誤"}
	}

	// 發JWT於cookie
	tokenString, err := Utils.SignJWT(user.ID, Consts.DefaultJWTExpireTime)
	if err != nil {
		return http.StatusInternalServerError, Type.Payload{Field: "root", Message: "伺服器錯誤"}
	}
	// set Cookie
	Utils.SetJTWCookie(w, tokenString, Consts.DefaultJWTExpireTime)
	fmt.Println("JWT tokenString:", tokenString)

	return http.StatusOK, Type.Payload{Message: "登入成功", Data: user}
}

func checkLogin(w http.ResponseWriter, r *http.Request) {
	// 檢查cookie是否有JWT，然後取出
	tokenString, err := Utils.GetJWTCookie(r)
	if err != nil {
		Utils.WriteJsonLogout(w, http.StatusBadRequest, Type.Payload{Message: "使用者未登入"})
		return
	}
	// 檢驗JWT，如檢驗通過則可以直接用
	token, err := Utils.IsValidJWT(tokenString)
	if err != nil {
		Utils.WriteJsonLogout(w, http.StatusBadRequest, Type.Payload{Message: "JWT驗證錯誤或缺少JWT"})
		return
	}
	claims, _ := token.Claims.(jwt.MapClaims)
	userID, ok := claims["userID"].(string)
        if !ok {
            Utils.WriteJsonLogout(w, http.StatusBadRequest, Type.Payload{Message: "缺少必要欄位"})
			return 
        }
	user, err := Utils.GetUserByID(DB.DB, userID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			Utils.WriteJsonLogout(w, http.StatusNotFound, Type.Payload{Message: "查無使用者"}) 
		} else {
			Utils.WriteJsonLogout(w, http.StatusBadRequest, Type.Payload{Message: "伺服器錯誤"})
		}
		return
	}

	Utils.WriteJsonSuccess(w, http.StatusOK, Type.Payload{Message: "使用者已登入", Data: user})
}

func logout(w http.ResponseWriter, request Type.LogoutRequest) (int, Type.Payload) {
	Utils.RemoveJWTCookie(w)

	return http.StatusOK, Type.Payload{Message: "登出成功"}
}


func InitHandler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/", home)
	mux.HandleFunc("POST /register", handle(handleRegister))
	mux.HandleFunc("POST /login", handle(handleLogin))
	mux.HandleFunc("/checkLogin", checkLogin)
	mux.HandleFunc("POST /logout", handle(logout))
	return chainMiddleware(mux, EnableCORS, RateLimit)
}