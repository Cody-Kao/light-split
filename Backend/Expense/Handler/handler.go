package Handler

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"expense/DB"
	"expense/Type"
	"expense/Utils"
	"fmt"
	"io"
	"math"
	"mime/multipart"
	"net/http"
	"slices"
	"strconv"
	"time"

	"expense/Consts"

	"github.com/go-playground/validator"
	"go.mongodb.org/mongo-driver/bson"
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
func handle[T Type.Request](handler func(T) (int, Type.Payload)) http.HandlerFunc {
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
		// 把JWT的userID從context裡取出
		// 比對該userID跟request的userID是否一致
		userID, ok := r.Context().Value(Consts.ContextKey).(string)
		if !ok {
			Utils.WriteJsonError(w, http.StatusInternalServerError, Type.Payload{Message: "context缺少必要欄位"})
			return
		}
		if userID != request.GetUserID() {
			Utils.WriteJsonError(w, http.StatusForbidden, Type.Payload{Message: "使用者無權限"})
			return
		}

		statusCode, payload := handler(request)
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

// generic function wrapper, for validation and decode/encode formData request and response	
func handleForm[T Type.Request](handler func(request T, r *http.Request) (int, Type.Payload)) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// 會直接把reader的connection給shutdown掉，所以對於browser會直接lose connection
		// 用於檔案超過一定限制時的直接手段，而像是postman這種則不會lose connection，而是會在之後的r.body中報錯
		// 所以如果是透過前端發送的(瀏覽器)，則應該在前端就檢查size limit，這樣基本上可完全避免之後loss connection問題
		r.Body = http.MaxBytesReader(w, r.Body, int64(Consts.MaxFormLimitSize))
		defer r.Body.Close()
		// Parse form (you can still use this to get file fields, but not for size limiting)
		// 這裡傳入的fileLimitSize並不是限制大小，而是在超過該大小之後的檔案會被讀寫到temp file而不是in memory
		if err := r.ParseMultipartForm(int64(Consts.MaxFormLimitSize)); err != nil {
			fmt.Println(err.Error())
			Utils.WriteJsonError(w, http.StatusRequestEntityTooLarge, Type.Payload{Field: "root", Message: "請求格式錯誤或超過大小限制"})
			return
		}
		defer r.MultipartForm.RemoveAll()

		// 處理image file的部分
		// Handle optional image file
		hasImage := false
		var imageFile multipart.File
		var imageHeader *multipart.FileHeader
		mimeType := ""
		var valid bool
		buffer := &bytes.Buffer{}

		imageFile, imageHeader, err := r.FormFile("image")
		if err == nil {
			defer imageFile.Close()
			fmt.Printf("Image uploaded: %s, size: %d\n", imageHeader.Filename, imageHeader.Size)
			hasImage = true
		} else if err != http.ErrMissingFile {
			Utils.WriteJsonError(w, http.StatusBadRequest, Type.Payload{Field: "root", Message: "讀取請求圖片失敗"})
			return
		}
		
		// 檢測image file
		if hasImage {
			// Wrap file with LimitReader of size limit + 1
			// limitReader的好處是只讀取傳入的限制大小的資料量，而設定成limit+1就是之後可以檢查是否超過limit
			limitedReader := io.LimitReader(imageFile, int64(Consts.FormLimitSize+1))
			n, err := io.Copy(buffer, limitedReader)
			if err != nil {
				Utils.WriteJsonError(w, http.StatusInternalServerError, Type.Payload{Field: "root", Message: "圖檔讀取錯誤"})
				return
			}

			// Check if it exceeds limit
			if n > int64(Consts.FormLimitSize) {
				Utils.WriteJsonError(w, http.StatusRequestEntityTooLarge, Type.Payload{Field: "root", Message: "檔案超過 3MB 限制"})
				return
			}

			// Check MIME type
			mimeType, valid = Utils.ValidateFileType(buffer.Bytes())
			if !valid {
				fmt.Printf("invalid type as %s\n", mimeType)
				Utils.WriteJsonError(w, http.StatusBadRequest, Type.Payload{Field: "root", Message: "檔案格式錯誤;只能是.jpg .png"})
				return
			}
		}
		
		// 處理json request的部分
		requestBody := r.FormValue("request")
		var request T
		if err := json.Unmarshal([]byte(requestBody), &request); err != nil {
			fmt.Println("JSON decode error:", err)
			Utils.WriteJsonError(w, http.StatusBadRequest, Type.Payload{Field: "root", Message: "無效的 JSON 請求"})
			return
		}
		fmt.Printf("request from formData:%v\n", request)
		if err := validate.Struct(request); err != nil {
			fmt.Println("Validation error:", err)
			Utils.WriteJsonError(w, http.StatusBadRequest, Type.Payload{Field: "root", Message: "欄位格式錯誤"})
			return
		}
		// 把JWT的userID從context裡取出
		// 比對該userID跟request的userID是否一致
		userID, ok := r.Context().Value(Consts.ContextKey).(string)
		if !ok {
			Utils.WriteJsonError(w, http.StatusInternalServerError, Type.Payload{Message: "context缺少必要欄位"})
			return
		}
		if userID != request.GetUserID() {
			Utils.WriteJsonError(w, http.StatusForbidden, Type.Payload{Message: "使用者無權限"})
			return
		}

		// 把image file跟header透過context的形式傳入
		if hasImage {
			ctx := context.WithValue(r.Context(), Consts.ImageFileContextKey, buffer)
			ctx = context.WithValue(ctx, Consts.ImageHeaderContextKey, imageHeader)
			fmt.Println("mimeType", mimeType)
			ctx = context.WithValue(ctx, Consts.ImageMIMETypeContextKey, mimeType)
			r = r.WithContext(ctx)
		}
		statusCode, payload := handler(request, r)
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

// view ALL expenses => return expense cards
func handleViewPaginatedExpenses(w http.ResponseWriter, r *http.Request) {
	// 從JWT取得userID
	userID, ok := r.Context().Value(Consts.ContextKey).(string)
	if !ok {
		Utils.WriteJsonError(w, http.StatusInternalServerError, Type.Payload{Message: "context缺少必要欄位"})
		return
	}
	// 找出使用者
	user, err := Utils.GetUserByID(DB.DB, userID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			Utils.WriteJsonError(w, http.StatusNotFound, Type.Payload{Field: "root", Message: "查無使用者"})
		} else {
			Utils.WriteJsonError(w, http.StatusForbidden, Type.Payload{Field: "root", Message: "未知錯誤"})
		}
		return
	}

	// 取得group且檢查user是否在該群組
	groupID := r.PathValue("groupID")
	if !slices.Contains(user.Groups, groupID) {
		Utils.WriteJsonError(w, http.StatusForbidden, Type.Payload{Field: "root", Message: "使用者無權限"})
	}
	group, err := Utils.GetGroupByID(DB.DB, groupID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			Utils.WriteJsonError(w, http.StatusNotFound, Type.Payload{Field: "root", Message: "查無群組"})
		} else {
			Utils.WriteJsonError(w, http.StatusForbidden, Type.Payload{Field: "root", Message: "伺服器錯誤"})
		}
		return
	}
	offset, err := strconv.ParseInt(r.PathValue("offset"), 10, 64)
	if err != nil {
		Utils.WriteJsonError(w, http.StatusBadRequest, Type.Payload{Field: "root", Message: "錯誤offset格式"})
		return
	}
	expenses, err := Utils.GetPaginatedData[Type.Expense](DB.DB.Collection("Expenses"), bson.M{"id":bson.M{"$in":group.Expenses}}, "editedAt", -1, offset*Consts.QueryLimit, Consts.QueryLimit+1)
	if err != nil {
		Utils.WriteJsonError(w, http.StatusForbidden, Type.Payload{Field: "root", Message: "伺服器錯誤"})
		return
	}
	haveMore := false
	// 檢查是否還有更多可以query
	if len(expenses) > int(Consts.QueryLimit) {
		haveMore = true 
		expenses = expenses[:len(expenses)-1]
	}
	expenseCards := make([]Type.ExpenseCard, 0)
	for _, expense := range expenses {
		creator, err := Utils.GetUserByID(DB.DB, expense.CreatorID)
		if err != nil {
			if errors.Is(err, mongo.ErrNoDocuments) {
				Utils.WriteJsonError(w, http.StatusNotFound, Type.Payload{Field: "root", Message: "查無使用者"})
			} else {
				Utils.WriteJsonError(w, http.StatusForbidden, Type.Payload{Field: "root", Message: "伺服器錯誤"})
			}
			return
		}
		expenseCards = append(expenseCards, Type.ExpenseCard{
			ID:expense.ID,
			Name:expense.Name,
			EditedAt: expense.EditedAt,
			CreatorName: creator.Name,
			CreatorID: creator.ID,
		})
	}

	groupExpenses := Type.GroupExpenses{
		ExpenseCards: expenseCards,
		HaveMore: haveMore,
	}

	err = Utils.WriteJsonSuccess(w, http.StatusOK, Type.Payload{Data: groupExpenses})
	if err != nil {
		Utils.WriteJsonError(w, http.StatusForbidden, Type.Payload{Field: "root", Message: "伺服器錯誤"})
	}
}	

// view one group
func handleViewExpense(w http.ResponseWriter, r *http.Request) {
	// 從JWT取得userID
	userID, ok := r.Context().Value(Consts.ContextKey).(string)
	if !ok {
		Utils.WriteJsonError(w, http.StatusInternalServerError, Type.Payload{Message: "context缺少必要欄位"})
		return
	}

	// 從path params找groupID
	groupID := r.PathValue("groupID")
	group, err := Utils.GetGroupByID(DB.DB, groupID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			Utils.WriteJsonError(w, http.StatusNotFound, Type.Payload{Field: "root", Message: "查無群組"})
		} else {
			Utils.WriteJsonError(w, http.StatusForbidden, Type.Payload{Field: "root", Message: "伺服器錯誤"})
		}
		return
	}

	expenseID := r.PathValue("expenseID")
	expense, err := Utils.GetExpenseByID(DB.DB, expenseID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			Utils.WriteJsonError(w, http.StatusNotFound, Type.Payload{Field: "root", Message: "查無花費"})
		} else {
			Utils.WriteJsonError(w, http.StatusForbidden, Type.Payload{Field: "root", Message: "伺服器錯誤"})
		}
		return
	}
	inGroup := false
	for _, member := range group.Members {
		if member.UserID == userID {
			inGroup = true 
			break
		}
	}

	members := make([]Type.Member, 0, len(group.Members))
	for _, member := range group.Members {
		if (member.Joined) {
			members = append(members, member)
		}
	}

	data := Type.ExpensePageResponse{
		Expense: *expense,
		Members: members,
		IsGroupSettled: group.Settled,
	}
	
	if inGroup && slices.Contains(group.Expenses, expenseID) {
		Utils.WriteJsonSuccess(w, http.StatusOK, Type.Payload{Message:"expense取得成功", Data:data})
	} else {
		Utils.WriteJsonError(w, http.StatusForbidden, Type.Payload{Field: "root", Message: "使用者無權限"})
	}
}

// create expense
func handleCreateExpense(request Type.CreateExpenseRequest, r *http.Request) (int, Type.Payload) {
	// check if the user exists
	user, err := Utils.GetUserByID(DB.DB, request.UserID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return http.StatusNotFound, Type.Payload{Field: "root", Message: "查無使用者"}
		} else {
			Utils.LogError("查詢使用者", err.Error())
			return http.StatusInternalServerError, Type.Payload{Field: "root", Message: "未知錯誤"}
		}
	}

	// 檢查群組存在且user和actualPayer都屬於該群組
	group, err := Utils.GetGroupByID(DB.DB, request.GroupID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return http.StatusNotFound, Type.Payload{Field: "root", Message: "查無群組"}
		} else {
			Utils.LogError("查詢群組", err.Error())
			return http.StatusInternalServerError, Type.Payload{Field: "root", Message: "未知錯誤"}
		}
	}
	if !slices.Contains(user.Groups, request.GroupID) {
		return http.StatusForbidden, Type.Payload{Field: "root", Message: "使用者無權限"}
	}
	// 如果該群組已核銷
	if group.Settled {
		return http.StatusForbidden, Type.Payload{Field: "root", Message: "該群組已核銷"}
	}

	actualPayer, err := Utils.GetUserByID(DB.DB, request.Expense.ActualPayer)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return http.StatusNotFound, Type.Payload{Field: "root", Message: "查無實際付款者"}
		} else {
			Utils.LogError("查詢實際付款使用者", err.Error())
			return http.StatusInternalServerError, Type.Payload{Field: "root", Message: "未知錯誤"}
		}
	}
	if !slices.Contains(actualPayer.Groups, request.GroupID) {
		return http.StatusForbidden, Type.Payload{Field: "root", Message: "實際付款者不在該群組"}
	}

	// 檢查欄位正確性
	valid, errorMsg := Utils.ValidateInput(request.Expense.Name, Consts.NonEmpty,
      Consts.OnlyAlphanumericChineseAndSpace, Consts.LessThan10Words)
	if !valid {
		return http.StatusBadRequest, Type.Payload{Field: "root", Message: "群組名稱"+errorMsg}
	}
	if !slices.Contains(Consts.Currency, request.Expense.Currency) {
		return http.StatusBadRequest, Type.Payload{Field: "root", Message: "未知幣別"}
	}
	if request.Expense.Amount <= 0 {
		return http.StatusBadRequest, Type.Payload{Field: "root", Message: "花費必須大於0"}
	}
	// 檢查加總
	if !request.Expense.Split {
		var payerAmount float64 = 0
		for _, payer := range request.Expense.Payers {
			payerAmount+=float64(payer.Amount)
		}
		if request.Expense.Amount != payerAmount {
			return http.StatusBadRequest, Type.Payload{Field: "root", Message: "花費總額必須相同"}
		}
	}

	// 加工payer順便檢查payer是否也都屬於該群組
	memberIDs := make([]string, 0, len(group.Members))
	for _, member := range group.Members {
		memberIDs = append(memberIDs, member.UserID)
	}
	payers := make([]Type.Payer, 0, len(request.Expense.Payers))
	for _, payer := range request.Expense.Payers {
		if payer.UserID == actualPayer.ID || !slices.Contains(memberIDs, payer.UserID) {
			return http.StatusBadRequest, Type.Payload{Field: "root", Message: "應付款者身分錯誤"}
		}
		// 查看是否payer name跟member name有對應上
		var memberName string 
		for _, member := range group.Members {
			if member.UserID == payer.UserID {
				memberName = member.Name
			}
		}
		if memberName != payer.Name {
			return http.StatusBadRequest, Type.Payload{Field: "root", Message: "應付款者名稱錯誤"}
		}

		payers = append(payers, Type.Payer{
			ID:Utils.GenerateUUID(),
			UserID: payer.UserID,
			Name:payer.Name,
			Amount: payer.Amount,
		})
	}
	
	// 從JWT取得image file和image header和mimeType
	ImageData := Utils.GetImageDataFromContext(r.Context())
	var imageBuf []byte = nil
	imageBuf, statusCode, err := Utils.ResizeAndCompressImage(ImageData, 400, 0);
	if err != nil {
		return statusCode, Type.Payload{Field: "root", Message: err.Error()}
	}
	
	// 處理image上傳
	expenseID := Utils.GenerateUUID()
	link := ""
	if ImageData != nil && imageBuf != nil {
		link, err = Utils.UploadToR2(imageBuf, 
		fmt.Sprintf("light-split-expense-%s-%s-%d", expenseID, ImageData.Header.Filename, time.Now().UnixNano()),
		ImageData.Header.Header.Get("Content-Type"))
		if err != nil {
			fmt.Println("image upload to R2 failed:", err.Error())
			return http.StatusInternalServerError, Type.Payload{Field: "root", Message: "圖片上傳失敗"}
		} 
	}

	/* 本地儲存
	// Ensure images directory exists
	if imageBuf != nil {
		if err := os.MkdirAll("images", os.ModePerm); err != nil {
		return http.StatusInternalServerError, Type.Payload{Field: "root", Message: err.Error()}
		}
		// save the resized image locally
		outFile, err := os.Create(path.Join("images", ImageData.Header.Filename))
		if err != nil {
			return http.StatusInternalServerError, Type.Payload{Field: "root", Message: err.Error()}
		}
		defer outFile.Close()
		// Write file from buffer
		if _, err := io.Copy(outFile, bytes.NewReader(imageBuf)); err != nil {
			return http.StatusInternalServerError, Type.Payload{Field: "root", Message: err.Error()}
		} 
	}
	*/

	// 創建expense
	newExpense := Type.Expense{
		ID: expenseID,
		Name: request.Expense.Name,
		ActualPayer: request.Expense.ActualPayer,
		Amount: request.Expense.Amount,
		EditedAt: Utils.GetToday(),
		GroupID: request.GroupID,
		CreatorID: request.Expense.CreatorID,
		Payers: payers,
		Currency: request.Expense.Currency,
		Split: request.Expense.Split,
		Note: request.Expense.Note,
		Image: link,
	}	

	err = Utils.WithTransaction(DB.DB, func(sc mongo.SessionContext) error {
		// 新增該筆expense
		if _, err := DB.DB.Collection("Expenses").InsertOne(sc, newExpense); err != nil {
			return err
		}

		// 新增對應expenseID至group
		if _, err := DB.DB.Collection("Groups").UpdateOne(sc, bson.M{"id":request.GroupID}, 
			bson.M{"$push":bson.M{"expenses":expenseID}}); err != nil {
			return err
		}
		
		return nil
	})
	
	if err != nil {
		fmt.Println("花費建立失敗:", err.Error())
		return http.StatusBadRequest, Type.Payload{Field: "root", Message: "花費建立失敗"}
	}

	return http.StatusOK, Type.Payload{Message: "花費建立成功", Data: expenseID}
}

// delete expense
func handleDeleteExpense(request Type.DeleteExpenseRequest) (int, Type.Payload) {
	// 找使用者
	_, err := Utils.GetUserByID(DB.DB, request.UserID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return http.StatusNotFound, Type.Payload{Field: "root", Message: "查無使用者"}
		}
		return http.StatusInternalServerError, Type.Payload{Field: "root", Message: "未知錯誤"}
	}

	// 找expense
	expense, err := Utils.GetExpenseByID(DB.DB, request.ExpenseID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return http.StatusNotFound, Type.Payload{Field: "root", Message: "查無花費"}
		}
		return http.StatusInternalServerError, Type.Payload{Field: "root", Message: "未知錯誤"}
	}
	
	// 確認該使用者有權限刪除
	if expense.CreatorID != request.UserID {
		return http.StatusForbidden, Type.Payload{Field: "root", Message: "無刪除權限"}
	}
	// 確認該花費屬於該群組
	if expense.GroupID != request.GroupID {
		return http.StatusForbidden, Type.Payload{Field: "root", Message: "花費不屬於該群組"}
	}
	group, err := Utils.GetGroupByID(DB.DB, request.GroupID)
	if err != nil {
		return http.StatusBadRequest, Type.Payload{Field: "root", Message: "查無群組"}
	}
	// 如果該群組已核銷
	if group.Settled {
		return http.StatusForbidden, Type.Payload{Field: "root", Message: "該群組已核銷"}
	}

	err = Utils.WithTransaction(DB.DB, func(sc mongo.SessionContext) error {
		_, err = DB.DB.Collection("Expenses").DeleteOne(sc, bson.M{"id":request.ExpenseID})
		if err != nil {
			return err
		}
		
		filter := bson.M{"id": request.GroupID}
		update := bson.M{"$pull": bson.M{"expenses": request.ExpenseID}}
		if _, err := DB.DB.Collection("Groups").UpdateOne(sc, filter, update); err != nil {
			return err
		}

		return nil
	})

	if err != nil {
		return http.StatusInternalServerError, Type.Payload{Field: "root", Message: "伺服器錯誤"}
	}

	return http.StatusOK, Type.Payload{Message: "花費刪除成功"}
}

func handleUpdateExpense(request Type.UpdateExpenseRequest, r *http.Request) (int, Type.Payload) {
	// 找使用者
	user, err := Utils.GetUserByID(DB.DB, request.UserID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return http.StatusNotFound, Type.Payload{Field: "root", Message: "查無使用者"}
		}
		return http.StatusInternalServerError, Type.Payload{Field: "root", Message: "未知錯誤"}
	}

	// 找expense
	expense, err := Utils.GetExpenseByID(DB.DB, request.ExpenseID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return http.StatusBadRequest, Type.Payload{Field: "root", Message: "查無花費"}
		}
		return http.StatusInternalServerError, Type.Payload{Field: "root", Message: "未知錯誤"}
	}

	// 確認user與expense在同一個group且與request中的groupID對應到
	if expense.GroupID != request.GroupID || !slices.Contains(user.Groups, request.GroupID) {
		return http.StatusBadRequest, Type.Payload{Field: "root", Message: "請求欄位錯誤"}
	}

	// 查看權限
	if expense.CreatorID != request.UserID {
		return http.StatusForbidden, Type.Payload{Field: "root", Message: "使用者無權限變更花費"}
	}

	// 找出group
	group, err := Utils.GetGroupByID(DB.DB, request.GroupID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return http.StatusNotFound, Type.Payload{Field: "root", Message: "查無群組"}
		} else {
			Utils.LogError("查詢群組", err.Error())
			return http.StatusInternalServerError, Type.Payload{Field: "root", Message: "未知錯誤"}
		}
	}
	// 如果該群組已核銷
	if group.Settled {
		return http.StatusForbidden, Type.Payload{Field: "root", Message: "該群組已核銷"}
	}

	// member id array
	memberIDs := make([]string, 0, len(group.Members))
	for _, member := range group.Members {
		memberIDs = append(memberIDs, member.UserID)
	}
	
	// 從JWT取得image file和image header和mimeType
	ImageData := Utils.GetImageDataFromContext(r.Context())
	var imageBuf []byte = nil
	imageBuf, statusCode, err := Utils.ResizeAndCompressImage(ImageData, 400, 0);
	if err != nil {
		return statusCode, Type.Payload{Field: "root", Message: err.Error()}
	}
	
	// 處理image上傳
	
	link := ""
	if ImageData != nil && imageBuf != nil {
		link, err = Utils.UploadToR2(imageBuf, 
		fmt.Sprintf("light-split-expense-%s-%s-%d", request.ExpenseID, ImageData.Header.Filename, time.Now().UnixNano()),
		ImageData.Header.Header.Get("Content-Type"))
		if err != nil {
			return http.StatusInternalServerError, Type.Payload{Field: "root", Message: err.Error()}
		} 
	}
	

	/* //本地儲存
	if imageBuf != nil {
		// Ensure images directory exists
		if err := os.MkdirAll("images", os.ModePerm); err != nil {
		return http.StatusInternalServerError, Type.Payload{Field: "root", Message: err.Error()}
		}
		// save the resized image locally
		outFile, err := os.Create(path.Join("images", ImageData.Header.Filename))
		if err != nil {
			return http.StatusInternalServerError, Type.Payload{Field: "root", Message: err.Error()}
		}
		defer outFile.Close()
		// Write file from buffer
		if _, err := io.Copy(outFile, bytes.NewReader(imageBuf)); err != nil {
			return http.StatusInternalServerError, Type.Payload{Field: "root", Message: err.Error()}
		}
	} */
	
	// 開始更新
	err = Utils.WithTransaction(DB.DB, func(sc mongo.SessionContext) error {
		coll := DB.DB.Collection("Expenses")
		originExpense, err := Utils.GetExpenseByID(DB.DB, request.ExpenseID)
		if err != nil {
			return err
		}
		update := bson.M{}
		if request.ExpenseName != "" {
			if isValid, errorMsg := Utils.ValidateInput(request.ExpenseName,
				Consts.LessThan10Words, Consts.NonEmpty, Consts.OnlyAlphanumericChineseAndSpace); !isValid {
				return errors.New(errorMsg)
			}
			update["name"] = request.ExpenseName
		}
		if request.Amount > 0 {
			update["amount"] = Utils.RoundFloat(request.Amount, 1)
		}
		if request.ActualPayerID != "" {
			update["actualPayer"] = request.ActualPayerID
		}
		if request.Currency != "" {
			if !slices.Contains(Consts.Currency, request.Currency) {
				return errors.New("幣別錯誤")
			}
			update["currency"] = request.Currency
		}
		if request.Note != "" {
			if isValid, errorMsg := Utils.ValidateInput(request.Note, Consts.LessThan350Words); !isValid {
				return errors.New(errorMsg)
			}
			update["note"] = request.Note
		}
		update["split"] = request.Split
		update["editedAt"] = Utils.GetToday()
		
		// 更新image的link
		if link != "" {
			update["image"] = link
		} else if link == "" && originExpense.Image != "" {
			update["image"] = ""
		}

		if len(update) > 0 {
			if _, err := coll.UpdateOne(sc, bson.M{"id": expense.ID}, bson.M{"$set": update}); err != nil {
				return err
			}
		}

		// 裝載要新增的payer，因為要自訂ID
		newPayers := make([]Type.Payer, 0, len(request.Add))

		// 提前結束：若是 split 模式，跳過金額檢查
		if !request.Split {
			// 檢查合計金額是否等於 expense.Amount
			// 更新 payer 資料前先產生完整的最新列表
			payers := []Type.Payer{}
			payers = append(payers, expense.Payers...)

			// 移除 payer
			if len(request.Remove) > 0 {
				removeSet := make(map[string]struct{}, len(request.Remove))
				for _, id := range request.Remove {
					removeSet[id] = struct{}{}
				}
				filtered := payers[:0]
				for _, p := range payers {
					if _, found := removeSet[p.ID]; !found {
						filtered = append(filtered, p)
					}
				}
				payers = filtered
			}

			// 更新 payer
			if len(request.Update) > 0 {
				// existing payers map
				payerMap := make(map[string]*Type.Payer, len(payers))
				for i := range payers {
					p := &payers[i]
					payerMap[p.ID] = p
				}
				for _, upd := range request.Update {
					if p, ok := payerMap[upd.ID]; ok {
						if upd.UserID != "" {
							memberName := ""
							for _, member := range group.Members {
								if member.UserID == upd.UserID {
									memberName = member.Name
									break
								}
							}
							if memberName != upd.Name {
								return errors.New("應付款人名稱錯誤")
							}
							p.UserID = upd.UserID
							if upd.Name != "" {
								p.Name = upd.Name
							}
						}
						if upd.Amount > 0 {
							p.Amount = upd.Amount
						}
					}
				}
			}

			// 新增 payer
			if len(request.Add) > 0 {
				for _, newPayer := range request.Add {
					if !slices.Contains(memberIDs, newPayer.UserID) {
						return errors.New("應付款人不屬於該群組")
					}
					memberName := ""
					for _, member := range group.Members {
						if member.UserID == newPayer.UserID {
							memberName = member.Name
							break
						}
					}
					if memberName != newPayer.Name {
						return errors.New("應付款人名稱錯誤")
					}
					newPayer.ID = Utils.GenerateUUID()
					newPayers = append(newPayers, newPayer)
					payers = append(payers, newPayer)
				}
			}

			// 驗證金額一致性
			var total float64
			for _, p := range payers {
				total += p.Amount
			}
			total = Utils.RoundFloat(total, 1)
			expected := Utils.RoundFloat(expense.Amount, 1)
			if request.Amount != 0 {
				expected = Utils.RoundFloat(float64(request.Amount), 1)
			}
			fmt.Println("total",total, "expected", expected)
			if math.Abs(total-expected) > 0.05 {
				return errors.New("分帳金額總和與總金額不符")
			}
		}

		

		// 移除
		if len(request.Remove) > 0 {
			_, err := coll.UpdateOne(sc, bson.M{"id": expense.ID},
				bson.M{"$pull": bson.M{"payers": bson.M{"id": bson.M{"$in": request.Remove}}}})
			if err != nil {
				return err
			}
		}

		// 新增
		if len(request.Add) > 0 {
			_, err := coll.UpdateOne(sc, bson.M{"id": expense.ID},
				bson.M{"$push": bson.M{"payers": bson.M{"$each": newPayers}}})
			if err != nil {
				return err
			}
		}

		// 單筆更新
		for _, p := range request.Update {
			updateFields := bson.M{}
			if p.Name != "" {
				updateFields["payers.$.name"] = p.Name
			}
			if p.UserID != "" {
				updateFields["payers.$.userID"] = p.UserID
			}
			if p.Amount > 0 {
				updateFields["payers.$.amount"] = Utils.RoundFloat(p.Amount, 1)
			}
			if len(updateFields) == 0 {
				continue
			}
			filter := bson.M{
				"id":        expense.ID,
				"payers.id": p.ID,
			}
			if _, err := coll.UpdateOne(sc, filter, bson.M{"$set": updateFields}); err != nil {
				return err
			}
		}
		
		
		
		return nil
	})


	if err != nil {
		Utils.LogError("更新花費", err.Error())
		return http.StatusInternalServerError, Type.Payload{Message: "花費更新失敗"}
	}

	return http.StatusOK, Type.Payload{Message: "花費更新成功"}
}

func handleChangeProfileImage(request Type.ChangeProfileImageRequest, r *http.Request) (int, Type.Payload) {
	_, err := Utils.GetUserByID(DB.DB, request.UserID)
	if err != nil {
		return http.StatusBadRequest, Type.Payload{Field: "root", Message: "查無使用者"}
	}

	// 從JWT取得image file和image header和mimeType
	ImageData := Utils.GetImageDataFromContext(r.Context())
	var imageBuf []byte = nil
	imageBuf, statusCode, err := Utils.ResizeAndCompressImage(ImageData, 180, 0);
	if err != nil {
		return statusCode, Type.Payload{Field: "root", Message: err.Error()}
	}
	
	// 處理image上傳
	link := ""
	if ImageData != nil && imageBuf != nil {
		link, err = Utils.UploadToR2(imageBuf, 
		fmt.Sprintf("light-split-profile-%s-%s-%d", request.UserID, ImageData.Header.Filename, time.Now().UnixNano()),
		ImageData.Header.Header.Get("Content-Type"))
		if err != nil {
			fmt.Println("image upload to R2 failed:", err.Error())
			return http.StatusInternalServerError, Type.Payload{Field: "root", Message: "圖片上傳失敗"}
		} 
	}
	response := Type.ChangeProfileImageResponse{
		Link: link,
	}

	// 儲存至資料庫
	writeCtx, cancel := context.WithTimeout(context.Background(), time.Second*5)
	defer cancel()
	_, err = DB.DB.Collection("Users").UpdateOne(writeCtx, bson.M{"id":request.UserID}, bson.M{"$set":bson.M{"image":link}})
	if err != nil {
		fmt.Println("saving image link failed:", err.Error())
		return http.StatusInternalServerError, Type.Payload{Field: "root", Message: "圖片儲存失敗"}
	}

	return http.StatusOK, Type.Payload{Message: "上傳使用者照片成功", Data: response}
}

func InitHandler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/", home)
	mux.HandleFunc("POST /createExpense", handleForm(handleCreateExpense))
	mux.HandleFunc("POST /updateExpense", handleForm(handleUpdateExpense))
	mux.HandleFunc("POST /deleteExpense", handle(handleDeleteExpense))
	mux.HandleFunc("/group/{groupID}/expenses/{offset}", handleViewPaginatedExpenses)
	mux.HandleFunc("/group/{groupID}/expense/{expenseID}", handleViewExpense)
	// 圖方便把該function寫在這裡(不然上傳圖片的程式碼會重複於多處)
	mux.HandleFunc("POST /changeProfileImage", handleForm(handleChangeProfileImage))
	return chainMiddleware(mux, EnableCORS, RateLimit, CheckAndValidateJWT)
}