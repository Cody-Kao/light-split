package Utils

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"expense/Consts"
	"expense/Type"
	"fmt"
	"image"
	"image/jpeg"
	"image/png"
	"math"
	"mime/multipart"
	"net/http"
	"os"
	"slices"
	"time"

	"github.com/disintegration/imaging"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"

	"github.com/aws/aws-sdk-go/aws"
	"github.com/aws/aws-sdk-go/aws/credentials"
	"github.com/aws/aws-sdk-go/aws/session"
	"github.com/aws/aws-sdk-go/service/s3"
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
func GetExpenseByID(DB *mongo.Database, expenseID string) (*Type.Expense, error) {
	var expense Type.Expense
	findCtx, cancel := context.WithTimeout(context.Background(), time.Second*5)
	defer cancel()

	err := DB.Collection("Expenses").FindOne(findCtx, bson.M{"id":expenseID}).Decode(&expense)
	if err != nil {
		return nil, err
	}

	return &expense, nil
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
			// stable tie-breaker
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

func RoundFloat(val float64, precision uint) float64 {
	decimal := float64(10*precision)
    return math.Floor(val*decimal)/decimal
}

func LogError(title string, errorMsg string) {
	fmt.Printf("%s: %s\n", title, errorMsg)
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

func ValidateFileType(headerBytes []byte) (string, bool) {
	mimeType := http.DetectContentType(headerBytes)
	return mimeType, slices.Contains(Consts.AllowedFileType, mimeType)
}

func GetImageDataFromContext(ctx context.Context) (*Type.ImageData) {
	file, ok1 := ctx.Value(Consts.ImageFileContextKey).(*bytes.Buffer)
	header, _ := ctx.Value(Consts.ImageHeaderContextKey).(*multipart.FileHeader)
	mime, _ := ctx.Value(Consts.ImageMIMETypeContextKey).(string)

	if !ok1 || file == nil {
		return nil
	}
	return &Type.ImageData{
		File:    file,
		Header:  header,
		MIMEType: mime,
	}
}

// ----------------resize image-----------------
func ResizeAndCompressImage(imageData *Type.ImageData, imageWidth int, imageHeight int) ([]byte, int, error) {
	if imageData == nil {
		return nil, http.StatusOK, nil
	}
	img, _, err := image.Decode(bytes.NewReader(imageData.File.Bytes()))
	if err != nil {
		fmt.Println(err.Error())
		return nil, http.StatusInternalServerError, errors.New("無法解碼圖像")
	}
	
	// Resize image to max width/height while maintaining aspect ratio
	resized := imaging.Resize(img, imageWidth, imageHeight, imaging.Lanczos) // retain aspect ratio
	ext := Consts.MimeExtMap[imageData.MIMEType]
	resizedBuf, err := CompressImage(resized, ext)
	if err != nil {
		fmt.Println(err.Error())
		return nil, http.StatusInternalServerError, errors.New("壓縮圖像發生錯誤")
	}

	return resizedBuf, http.StatusOK, nil
}

func CompressImage(img image.Image, ext string) ([]byte, error) {
	var buf bytes.Buffer

	switch ext {
	case ".jpg", ".jpeg":
		// Use 80% quality for JPEG
		opts := jpeg.Options{Quality: 80}
		err := jpeg.Encode(&buf, img, &opts)
		if err != nil {
			return nil, err
		}

	case ".png":
		// Use DefaultCompression level for PNG
		encoder := png.Encoder{CompressionLevel: png.DefaultCompression}
		err := encoder.Encode(&buf, img)
		if err != nil {
			return nil, err
		}

	default:
		return nil, fmt.Errorf("unsupported image format: %s", ext)
	}

	return buf.Bytes(), nil
}

/* func UploadToImgur(imageBytes []byte, fileName string) (string, error) {
	if len(imageBytes) == 0 { // this can also check if imageBytes == nil
		return "", nil
	}

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	part, err := writer.CreateFormFile("image", fileName)
	if err != nil {
		return "", err
	}
	if _, err := part.Write(imageBytes); err != nil {
		return "", err
	}
	writer.Close()

	req, err := http.NewRequest("POST", "https://api.imgur.com/3/image", body)
	if err != nil {
		return "", err
	}
	
	req.Header.Set("Authorization", "Bearer " + Consts.ImgurAccessToken)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	client := &http.Client{}
	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("imgur upload failed with status: %s", resp.Status)
	}

	var result struct {
		Data struct {
			Link string `json:"link"`
		} `json:"data"`
		Success bool `json:"success"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return "", err
	}
	if !result.Success {
		return "", fmt.Errorf("imgur API responded with failure")
	}

	return result.Data.Link, nil
} */

func UploadToR2(imageBytes []byte, fileName string, contentType string) (string, error) {
	if len(imageBytes) == 0 {
		return "", nil
	}

	sess, err := session.NewSession(&aws.Config{
		Region:           aws.String(Consts.R2Region),
		Endpoint:         aws.String(Consts.R2S3APIEndpoint),
		S3ForcePathStyle: aws.Bool(true),
		Credentials:      credentials.NewStaticCredentials(Consts.R2AccessKeyID, Consts.R2SecretAccessKey, ""),
	})
	if err != nil {
		return "", fmt.Errorf("failed to initialize R2 session: %w", err)
	}

	s3Client := s3.New(sess)

	_, err = s3Client.PutObjectWithContext(context.Background(), &s3.PutObjectInput{
		Bucket:      aws.String(Consts.R2Bucket),
		Key:         aws.String(fileName),
		Body:        bytes.NewReader(imageBytes),
		ContentType: aws.String(contentType),
		ACL:         aws.String("public-read"),
	})
	if err != nil {
		return "", fmt.Errorf("failed to upload to R2: %w", err)
	}

	publicURL := fmt.Sprintf("%s/%s", Consts.PublicBaseURL, fileName)
	return publicURL, nil
}
