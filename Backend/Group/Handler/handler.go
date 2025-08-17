package Handler

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"group/DB"
	"group/Type"
	"group/Utils"
	"math"
	"net/http"
	"slices"
	"sort"
	"strconv"
	"time"

	"group/Consts"

	"github.com/go-playground/validator"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
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
			Utils.WriteJsonError(w, http.StatusInternalServerError, Type.Payload{Field: "Logout", Message: "context缺少必要欄位"})
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

// view ALL groups
func handleViewPaginatedGroups(w http.ResponseWriter, r *http.Request) {
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
			Utils.WriteJsonError(w, http.StatusInternalServerError, Type.Payload{Field: "root", Message: "未知錯誤"})
		}
		return
	}

	offset, err := strconv.ParseInt(r.PathValue("offset"), 10, 64)
	if err != nil {
		Utils.WriteJsonError(w, http.StatusBadRequest, Type.Payload{Field: "root", Message: "錯誤offset格式"})
		return
	}
	groups, err := Utils.GetPaginatedData[Type.Group](DB.DB.Collection("Groups"), bson.M{"id":bson.M{"$in":user.Groups}}, "createdAt", -1, offset*Consts.QueryLimit, Consts.QueryLimit+1)
	if err != nil {
		Utils.WriteJsonError(w, http.StatusForbidden, Type.Payload{Field: "root", Message: "伺服器錯誤"})
		return
	}
	haveMore := false
	// 檢查是否還有更多可以query
	if len(groups) > int(Consts.QueryLimit) {
		haveMore = true 
		groups = groups[:len(groups)-1]
	}
	
	groupCards := make([]Type.GroupCard, 0)
	for _, group := range groups {
		creatorName := ""
		for _, member := range group.Members {
			if member.UserID == group.CreatorID {
				creatorName = member.Name
				break
			}
		}
		memberCnt := 0
		for _, member := range group.Members {
			if member.Joined {
				memberCnt+=1
			}
		}
		groupCards = append(groupCards, Type.GroupCard{
			ID:group.ID,
			Name:group.Name,
			CreatedAt: group.CreatedAt,
			CreatorID: group.CreatorID,
			CreatorName: creatorName,
			MemberCnt: memberCnt,
			Settled: group.Settled,
		})
	}
	GroupsResponse := Type.GroupsResponse{
		GroupCards: groupCards,
		HaveMore: haveMore,
	} 
	err = Utils.WriteJsonSuccess(w, http.StatusOK, Type.Payload{Message: "GroupsResponse獲取成功", Data: GroupsResponse})
	if err != nil {
		Utils.WriteJsonError(w, http.StatusInternalServerError, Type.Payload{Field: "root", Message: "伺服器錯誤"})
	}
}	

// view one group
func handleViewGroup(w http.ResponseWriter, r *http.Request) {
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
			Utils.WriteJsonError(w, http.StatusInternalServerError, Type.Payload{Field: "root", Message: "伺服器錯誤"})
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
	
	data := Type.GroupResponse{
		ID: group.ID,
		Name: group.Name,
		CreatedAt: group.CreatedAt,
		CreatorID: group.CreatorID,
		Expenses: group.Expenses,
		Settled: group.Settled,
	}
	if inGroup {
		Utils.WriteJsonSuccess(w, http.StatusOK, Type.Payload{Message: "group獲取成功", Data:data})
	} else {
		Utils.WriteJsonError(w, http.StatusForbidden, Type.Payload{Field: "root", Message: "使用者無權限"})
	}
}

// create group
func handleCreateGroup(request Type.CreateGroupRequest) (int, Type.Payload) {
	// check if the user exists
	user, err := Utils.GetUserByID(DB.DB, request.UserID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return http.StatusNotFound, Type.Payload{Field: "root", Message: "查無使用者"}
		} else {
			return http.StatusInternalServerError, Type.Payload{Field: "root", Message: "未知錯誤"}
		}
	}

	// 檢查欄位正確性
	valid, errorMsg := Utils.ValidateInput(request.Group.Name, Consts.NonEmpty,
      Consts.OnlyAlphanumericChineseAndSpace, Consts.LessThan10Words)
	if !valid {
		return http.StatusBadRequest, Type.Payload{Field: "root", Message: "群組名稱"+errorMsg}
	}
	
	nameMap := make(map[string]struct{})
	valid, errorMsg = Utils.ValidateInput(request.Group.CreatorName, Consts.NonEmpty,
      Consts.OnlyAlphanumericChineseAndSpace, Consts.LessThan10Words)
	if !valid {
		return http.StatusBadRequest, Type.Payload{Field: "root", Message: "創建人名稱"+errorMsg}
	}
	nameMap[request.Group.CreatorName] = struct{}{}
	
	for _, member := range request.Group.Members {
		valid, errorMsg = Utils.ValidateInput(member.Name, Consts.NonEmpty,
      Consts.OnlyAlphanumericChineseAndSpace, Consts.LessThan10Words)
		if !valid {
			return http.StatusBadRequest, Type.Payload{Field: "root", Message: "成員欄位"+errorMsg}
		} else if _, ok := nameMap[member.Name]; ok {
			return http.StatusBadRequest, Type.Payload{Field: "root", Message: "成員名稱不得重複"}
		}
		nameMap[member.Name] = struct{}{}
	}
	
	// 加工member
	members := make([]Type.Member, 0, len(request.Group.Members))
	for _, member := range request.Group.Members {
		members = append(members, Type.Member{
			ID:Utils.GenerateUUID(),
			Name:member.Name,
			Joined:false,
		})
	}
	// 把creator資訊存入
	members = append(members, Type.Member{
		ID:Utils.GenerateUUID(),
		Name: request.Group.CreatorName,
		UserID: request.UserID,
		UserName: user.Name,
		Joined: true,
	})
	
	// 創建group
	groupID := Utils.GenerateUUID()
	newGroup := Type.Group{
		ID: groupID,
		Name: request.Group.Name,
		CreatedAt: Utils.GetToday(),
		CreatorID: request.UserID,
		Members: members,
		Expenses: make([]string, 0),
	}	

	err = Utils.WithTransaction(DB.DB, func(sc mongo.SessionContext) error {
		if _, err := DB.DB.Collection("Groups").InsertOne(sc, newGroup); err != nil {
			return err
		}
		// Update user with group ID
		update := bson.M{"$push": bson.M{"groups": newGroup.ID}}
		filter := bson.M{"id": request.UserID}
		if _, err := DB.DB.Collection("Users").UpdateOne(sc, filter, update); err != nil {
			return err
		}

		// add group info to OpenGroup
		if len(members) > 1 {
			openGroupMembers := make([]Type.OpenGroupMember, 0, len(members))
			for _, member := range members {
				if member.UserID != request.UserID {
					openGroupMembers = append(openGroupMembers, Type.OpenGroupMember{
					ID: member.ID,
					Name: member.Name,
					})
				}
				
			}	
			if _, err := DB.DB.Collection("OpenGroups").InsertOne(sc, Type.OpenGroup{
				ID:Utils.GenerateUUID(), 
				GroupID: groupID,
				Members: openGroupMembers}); err != nil {
				return err
			}
		}

		return nil
	})
	
	if err != nil {
		fmt.Println("群組建立失敗:", err.Error())
		return http.StatusInternalServerError, Type.Payload{Field: "root", Message: "群組建立失敗"}
	}

	data := Type.CreateGroupResponse{
		GroupID: groupID,
	}
	return http.StatusOK, Type.Payload{Message: "群組建立成功", Data: data}
}

// delete group
func handleDeleteGroup(request Type.DeleteGroupRequest) (int, Type.Payload) {
	// 找使用者
	user, err := Utils.GetUserByID(DB.DB, request.UserID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return http.StatusNotFound, Type.Payload{Field: "root", Message: "查無使用者"}
		}
		return http.StatusInternalServerError, Type.Payload{Field: "root", Message: "未知錯誤"}
	}
	// 找群組
	group, err := Utils.GetGroupByID(DB.DB, request.GroupID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return http.StatusNotFound, Type.Payload{Field: "root", Message: "查無群組"}
		}
		return http.StatusInternalServerError, Type.Payload{Field: "root", Message: "未知錯誤"}
	}
	// 確認該使用者有權限刪除
	if group.CreatorID != user.ID {
		return http.StatusForbidden, Type.Payload{Field: "root", Message: "無刪除權限"}
	}

	err = Utils.WithTransaction(DB.DB, func(sc mongo.SessionContext) error {
		_, err = DB.DB.Collection("Groups").DeleteOne(sc, bson.M{"id":request.GroupID})
		if err != nil {
			return err
		}
		
		update := bson.M{"$pull": bson.M{"groups": request.GroupID}}
		filter := bson.M{"id": request.UserID}
		if _, err := DB.DB.Collection("Users").UpdateOne(sc, filter, update); err != nil {
			return err
		}

		// delete record from OpenGroup, if any
		_, err = DB.DB.Collection("OpenGroups").DeleteOne(sc, bson.M{"groupID": group.ID})
		if err != nil {
			return err
		}

		// delete the corresponding expenses
		_, err = DB.DB.Collection("Expenses").DeleteMany(sc, bson.M{"groupID":request.GroupID})
		if err != nil {
			return err
		}
		
		return nil
	})

	if err != nil {
		fmt.Println("刪除群組錯誤:", err.Error())
		return http.StatusInternalServerError, Type.Payload{Field: "root", Message: "伺服器錯誤"}
	}

	return http.StatusOK, Type.Payload{Message: "群組刪除成功"}
}

func handleGetJoinedMembers(w http.ResponseWriter, r* http.Request) {
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
			Utils.WriteJsonError(w, http.StatusInternalServerError, Type.Payload{Field: "root", Message: "伺服器錯誤"})
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
	if !inGroup {
		Utils.WriteJsonError(w, http.StatusForbidden, Type.Payload{Field: "root", Message: "使用者無權限"})
		return 
	}
	members := make([]Type.Member, 0, len(group.Members))
	for _, member := range group.Members {
		if member.Joined {
			members = append(members, member)
		}
	}
	data := Type.GetJoinedMembersResponse{
		GroupName: group.Name,
		Members: members,
	}

	Utils.WriteJsonSuccess(w, http.StatusOK, Type.Payload{Message: "獲取joined members成功", Data: data})
}

func handleGetMembers(w http.ResponseWriter, r *http.Request) {
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
			Utils.WriteJsonError(w, http.StatusInternalServerError, Type.Payload{Field: "root", Message: "伺服器錯誤"})
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
	if !inGroup {
		Utils.WriteJsonError(w, http.StatusForbidden, Type.Payload{Field: "root", Message: "使用者無權限"})
		return 
	}

	// 取得Member所需資訊
	members := make([]Type.Member, 0, len(group.Members))
	joinedUserIDs := make([]string, 0, len(group.Members))
	for _, member := range group.Members {
		if member.Joined {
			joinedUserIDs = append(joinedUserIDs, member.UserID)
		}
	}
	findCtx, cancel := context.WithTimeout(context.Background(), time.Second*5)
	defer cancel()
    cursor, err := DB.DB.Collection("Users").Find(findCtx, bson.M{"id": bson.M{"$in":joinedUserIDs}})
    if err != nil {
        Utils.WriteJsonError(w, http.StatusNotFound, Type.Payload{Field: "root", Message: "查無成員"})
		return
	}
    defer cursor.Close(findCtx)

    var joinedUsers []Type.User
    if err := cursor.All(findCtx, &joinedUsers); err != nil {
        Utils.WriteJsonError(w, http.StatusNotFound, Type.Payload{Field: "root", Message: "查無成員"})
		return
    }
	fmt.Println("joinedUsers:", joinedUsers)
	// 依照ID從大到小
	sort.Slice(joinedUsers, func(i, j int) bool {
		return joinedUsers[i].ID > joinedUsers[j].ID
	})
	// 先把已加入的放置前面; 順便找出他的user image
	for _, member := range group.Members {
		if member.Joined {
			userImage := "" 
			for _, user := range joinedUsers {
				if user.ID == member.UserID {
					userImage = user.Image
				}
			}
			member.Image = userImage
			members = append(members, member)
		}
	}

	// 再把未加入的塞入後面
	for _, member := range group.Members {
		if !member.Joined {
			members = append(members, member)
		}
	}

	Utils.WriteJsonSuccess(w, http.StatusOK, Type.Payload{Message: "成功取得members", Data: members})
}

func handleAddMembers(request Type.AddMembersRequest) (int, Type.Payload) {
	// 取得group
	group, err := Utils.GetGroupByID(DB.DB, request.GroupID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return http.StatusNotFound, Type.Payload{Field: "root", Message: "查無群組"}
		}
		return http.StatusInternalServerError, Type.Payload{Field: "root", Message: "伺服器錯誤"}
	}
	if group.CreatorID != request.UserID {
		return http.StatusForbidden, Type.Payload{Field: "root", Message: "無權限加入更多成員"}
	}
	// 如果該群組已核銷
	if group.Settled {
		return http.StatusForbidden, Type.Payload{Field: "root", Message: "該群組已核銷"}
	}
	// 轉換成Member以及OpenGroupMember types並且驗證名字是否合規
	members := make([]Type.Member, 0, len(request.Members))
	openGroupMembers := make([]Type.OpenGroupMember, 0, len(group.Members))
	existingMemberNames := make([]string, 0, len(group.Members))
	for _, member := range group.Members {
		existingMemberNames = append(existingMemberNames, member.Name)
	}
	for _, member := range request.Members {
		isValid, errorMsg := Utils.ValidateInput(member.Name, Consts.NonEmpty, 
			Consts.OnlyAlphanumericChineseAndSpace, Consts.LessThan10Words)
		if !isValid {
			return http.StatusBadRequest, Type.Payload{Field: "root", Message: errorMsg}
		}
		if (slices.Contains(existingMemberNames, member.Name)) {
			return http.StatusBadRequest, Type.Payload{Field: "root", Message: "成員名稱不得重複"}
		}
		memberID := Utils.GenerateUUID()
		members = append(members, Type.Member{
			ID:memberID,
			Name: member.Name,
		})
		openGroupMembers = append(openGroupMembers, Type.OpenGroupMember{
			ID:memberID,
			Name: member.Name,
		})
	}
	// 加入member slots至group以及OpenGroup
	err = Utils.WithTransaction(DB.DB, func(sc mongo.SessionContext) error {
		// 加入group
		updateGroup := bson.M{
			"$addToSet": bson.M{
				"members": bson.M{
					"$each": members,
				},
			},
		}
		_, err := DB.DB.Collection("Groups").UpdateOne(sc, bson.M{"id":group.ID}, updateGroup)
		if err != nil {
			return err
		}
		// 加入openGroup，若不存在則創建一個
		updateOpenGroup := bson.M{
			"$addToSet": bson.M{
				"members": bson.M{
					"$each": openGroupMembers,
				},
			},
			"$setOnInsert": bson.M{
				"id": Utils.GenerateUUID(),
				"groupID": group.ID,
			},
		}
		opts := options.Update().SetUpsert(true)
		_, err = DB.DB.Collection("OpenGroups").UpdateOne(sc, bson.M{"groupID":group.ID}, updateOpenGroup, opts)
		if err != nil {
			return err
		}
		return nil
	})
	if err != nil {
		return http.StatusInternalServerError, Type.Payload{Field: "root", Message: "伺服器錯誤"}
	}
	return http.StatusOK, Type.Payload{Field:"root", Message: "成功加入更多成員"}
}

func handleDeleteMember(request Type.DeleteMemberRequest) (int, Type.Payload) {
	// 取得group
	group, err := Utils.GetGroupByID(DB.DB, request.GroupID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return http.StatusNotFound, Type.Payload{Field: "root", Message: "查無群組"}
		}
		return http.StatusInternalServerError, Type.Payload{Field: "root", Message: "伺服器錯誤"}
	}
	if group.CreatorID != request.UserID {
		return http.StatusForbidden, Type.Payload{Field: "root", Message: "無權限刪除成員"}
	}
	// 如果該群組已核銷
	if group.Settled {
		return http.StatusForbidden, Type.Payload{Field: "root", Message: "該群組已核銷"}
	}

	var memberToDelete Type.Member  
	for _, member := range group.Members {
		if member.ID == request.MemberID {
			memberToDelete = member
		}
	}
	
	if memberToDelete == (Type.Member{}) {
		return http.StatusNotFound, Type.Payload{Field: "root", Message: "查無欲刪除之成員"}
	}

	err = Utils.WithTransaction(DB.DB, func(sc mongo.SessionContext) (error) {
		_, err := DB.DB.Collection("Groups").UpdateOne(sc, bson.M{"id": request.GroupID}, 
    			bson.M{"$pull": bson.M{"members": bson.M{"id": request.MemberID}}})
		if err != nil {
			return err
		}

		// 查看memberToDelete是否為已加入成員=>刪除對應user的group;否則刪除openGroup對應的member
		if memberToDelete.Joined {
			user, err := Utils.GetUserByID(DB.DB, memberToDelete.UserID)
			if err != nil {
				return err
			}

			_, err = DB.DB.Collection("Users").UpdateOne(sc, bson.M{"id":user.ID}, 
					bson.M{"$pull":bson.M{"groups":request.GroupID}})
			if err != nil {
				return err
			}

			// 刪除所有與他有關的expense
			var expenses []Type.Expense
			cursor, err := DB.DB.Collection("Expenses").Find(sc, bson.M{"id": bson.M{"$in": group.Expenses}})
			if err != nil {
				return err
			}
			defer cursor.Close(sc) // always defer closing the cursor

			// decode all documents into the slice
			if err := cursor.All(sc, &expenses); err != nil {
				return err
			}

			toDeleteExpenseID := make([]string, 0, len(expenses))
			for _, expense := range expenses {
				if expense.CreatorID == user.ID || expense.ActualPayer == user.ID {
					toDeleteExpenseID = append(toDeleteExpenseID, expense.ID)
					continue
				}
				// 處理若他為payer的情況
				// 1.先把他總付的錢加起來 2.直接從amount中扣掉即可 3.移除該payer 4.若他是唯一的payer則移除該花費
				var pay float64 = 0
				for _, payer := range expense.Payers {
					if payer.UserID == user.ID {
						pay+=float64(payer.Amount)
					}
				}
				if pay > 0 {
					_, err = DB.DB.Collection("Expenses").UpdateOne(sc, bson.M{"id": expense.ID},
						bson.M{
							"$set": bson.M{"amount": expense.Amount - pay},
							"$pull": bson.M{"payers": bson.M{"userID": request.UserID}},
						},
					)
					if err != nil {
						return err
					}
					// 唯一的payer
					if len(expense.Payers) == 1 {
						toDeleteExpenseID = append(toDeleteExpenseID, expense.ID)
					}
				}
			}

			// 從group刪除對應的expenseIDs
			_, err = DB.DB.Collection("Groups").UpdateOne(sc, bson.M{"id":request.GroupID}, 
					bson.M{"$pull": bson.M{"expenses": bson.M{"$in": toDeleteExpenseID}}})
			if err != nil {
				return err
			}
			// 從expenses中刪除對應的expense
			_, err = DB.DB.Collection("Expenses").DeleteMany(sc, 
				bson.M{"id": bson.M{"$in": toDeleteExpenseID}})
			if err != nil {
				return err
			}
			fmt.Println("刪除已加入成員")
		} else {
			_, err := DB.DB.Collection("OpenGroups").UpdateOne(sc, bson.M{"groupID":request.GroupID}, 
			bson.M{"$pull":bson.M{"members":bson.M{"id":request.MemberID}}})
			if err != nil {
				return err
			}
			fmt.Println("刪除未加入成員")

			// delete the document from openGroups if there is no more non-joined members
			var openGroup Type.OpenGroup
			err = DB.DB.Collection("OpenGroups").FindOne(sc, bson.M{"groupID":request.GroupID}).Decode(&openGroup)
			if err != nil {
				return err
			}
			if len(openGroup.Members) == 0 {
				_, err = DB.DB.Collection("OpenGroups").DeleteOne(sc, bson.M{"id": openGroup.ID})
				if err != nil {
					return err
				}
				fmt.Println("刪除OpenGroup")
			}
		}
		
		return  nil
	})

	if err != nil {
		return http.StatusInternalServerError, Type.Payload{Field: "root", Message: "刪除成員失敗"}
	}

	return http.StatusOK, Type.Payload{Message: "刪除成員成功"}
}

func handleGetJoinGroupLink(w http.ResponseWriter, r *http.Request) {
	JWTuserID, ok := r.Context().Value(Consts.ContextKey).(string)
	if !ok {
		Utils.WriteJsonError(w, http.StatusInternalServerError, Type.Payload{Message: "context缺少必要欄位"})
		return
	}
	userID := r.URL.Query().Get("userID")
	groupID := r.URL.Query().Get("groupID")
	if userID == "" || groupID == "" {
		Utils.WriteJsonError(w, http.StatusBadRequest, Type.Payload{Field: "root", Message: "缺少必要參數"})
		return
	}
	if userID != JWTuserID {
		Utils.WriteJsonError(w, http.StatusBadRequest, Type.Payload{Field: "root", Message: "使用者無權限"})
		return
	}

	// 找出使用者
	user, err := Utils.GetUserByID(DB.DB, userID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			Utils.WriteJsonError(w, http.StatusNotFound, Type.Payload{Field: "root", Message: "查無使用者"}) 
		} else {
			Utils.WriteJsonError(w, http.StatusInternalServerError, Type.Payload{Field: "root", Message: "未知錯誤"})
		}
		return
	}
	// 找出群組
	_, err = Utils.GetGroupByID(DB.DB, groupID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			Utils.WriteJsonError(w, http.StatusNotFound, Type.Payload{Field: "root", Message: "查無群組"})
		} else {
			Utils.WriteJsonError(w, http.StatusInternalServerError, Type.Payload{Field: "root", Message: "伺服器錯誤"})
		}
		return
	}

	// 確認該使用者存在於該群組
	if !slices.Contains(user.Groups, groupID) {
		Utils.WriteJsonError(w, http.StatusBadRequest, Type.Payload{Field: "root", Message: "你未加入該群組"})
		return
	}
	var openGroup Type.OpenGroup
	findCtx, cancel := context.WithTimeout(context.Background(), time.Second*5)
	defer cancel()
	err = DB.DB.Collection("OpenGroups").FindOne(findCtx, bson.M{"groupID":groupID}).Decode(&openGroup)
	if err != nil {  // 保險起見多檢查一個members array
		Utils.WriteJsonError(w, http.StatusBadRequest, Type.Payload{Field: "root", Message: "查無開放之群組"})
		return
	}

	if len(openGroup.Members) > 0  {
		link := fmt.Sprintf("/join/%s/%s", openGroup.ID, openGroup.GroupID)
		Utils.WriteJsonSuccess(w, http.StatusOK, Type.Payload{Message: "成功取得邀請連結", 
		Data: Type.GetJoinGroupLinkResponse{Link:&link}})
	} else {
		Utils.WriteJsonSuccess(w, http.StatusOK, Type.Payload{Message: "成功取得邀請連結", Data: nil})
	}
}

func handleGetJoinGroupData(w http.ResponseWriter, r *http.Request) {
	JWTuserID, ok := r.Context().Value(Consts.ContextKey).(string)
	if !ok {
		Utils.WriteJsonError(w, http.StatusInternalServerError, Type.Payload{Message: "context缺少必要欄位"})
		return
	}
	userID := r.PathValue("userID")
	if userID != JWTuserID {
		Utils.WriteJsonError(w, http.StatusForbidden, Type.Payload{Message: "使用者無權限"})
		return
	}
	openGroupID := r.PathValue("openGroupID")
	groupID := r.PathValue("groupID")
	if openGroupID == "" || groupID == "" {
		Utils.WriteJsonError(w, http.StatusBadRequest, Type.Payload{Message: "缺少必要參數"})
		return
	}

	user, err := Utils.GetUserByID(DB.DB, userID)
	if err != nil {
		Utils.WriteJsonError(w, http.StatusBadRequest, Type.Payload{Message: "查無使用者"})
		return
	}
	if slices.Contains(user.Groups, groupID) {
		Utils.WriteJsonError(w, http.StatusBadRequest, Type.Payload{Message: "使用者已加入群組"})
		return
	}

	var openGroup Type.OpenGroup
	findCtx, cancel := context.WithTimeout(context.Background(), time.Second*5)
	defer cancel()
	err = DB.DB.Collection("OpenGroups").FindOne(findCtx, bson.M{"id":openGroupID}).Decode(&openGroup)
	if err != nil {
		Utils.WriteJsonError(w, http.StatusBadRequest, Type.Payload{Message: "查無開放群組"})
		return
	}
	if openGroup.GroupID != groupID {
		Utils.WriteJsonError(w, http.StatusBadRequest, Type.Payload{Message: "群組資訊錯誤"})
		return
	}

	group, err := Utils.GetGroupByID(DB.DB, openGroup.GroupID)
	if err != nil {
		Utils.WriteJsonError(w, http.StatusBadRequest, Type.Payload{Message: "查無群組"})
		return
	}
	data := Type.GetJoinGroupDataResponse{
		GroupID: openGroup.GroupID,
		GroupName: group.Name,
		Members: openGroup.Members,
	}
	Utils.WriteJsonSuccess(w, http.StatusOK, Type.Payload{Message: "取得加入群組數據成功", Data: data})
}

// 從join連結加入group
func handleJoinGroup(request Type.JoinGroupRequest) (int, Type.Payload) {
	// 找出使用者
	user, err := Utils.GetUserByID(DB.DB, request.UserID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return http.StatusNotFound, Type.Payload{Field: "root", Message: "查無使用者"}
		}
		return http.StatusInternalServerError, Type.Payload{Field: "root", Message: "未知錯誤"}
	}
	// 找出群組
	group, err := Utils.GetGroupByID(DB.DB, request.GroupID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return http.StatusNotFound, Type.Payload{Field: "root", Message: "查無群組"}
		}
		return http.StatusInternalServerError, Type.Payload{Field: "root", Message: "伺服器錯誤"}
	}
	// 如果該群組已核銷
	if group.Settled {
		return http.StatusForbidden, Type.Payload{Field: "root", Message: "該群組已核銷"}
	}
	// 確認該使用者不存在於該群組
	if slices.Contains(user.Groups, request.GroupID) {
		return http.StatusBadRequest, Type.Payload{Field: "root", Message: "你已加入該群組"}
	}

	// 確認memberID存在於group與OpenGroup
	flag := false
	for _, member := range group.Members {
		if member.ID == request.MemberID {
			flag = true 
			break
		}
	}
	if !flag {
		return http.StatusNotFound, Type.Payload{Field: "root", Message: "查無選定加入之成員"}
	}
	var openGroup Type.OpenGroup
	findCtx, cancel := context.WithTimeout(context.Background(), time.Second*5)
	defer cancel()
	err = DB.DB.Collection("OpenGroups").FindOne(findCtx, bson.M{"groupID":request.GroupID}).Decode(&openGroup)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return http.StatusNotFound, Type.Payload{Field: "root", Message: "查無群組"}
		}
		return http.StatusInternalServerError, Type.Payload{Field: "root", Message: "伺服器錯誤"}
	}
	flag = false
	for _, member := range openGroup.Members {
		if member.ID == request.MemberID {
			flag = true 
			break
		}
	}
	if !flag {
		return http.StatusNotFound, Type.Payload{Field: "root", Message: "查無選定加入之成員"}
	}

	// 加入group且更新user.groups，並從openGroup中移除
	err = Utils.WithTransaction(DB.DB, func(sc mongo.SessionContext) error {
		groupFilter := bson.M{"id": request.GroupID, "members.id": request.MemberID}
		groupUpdate := bson.M{"$set": bson.M{
			"members.$.userName": user.Name,
			"members.$.userID":   user.ID,
			"members.$.joined":   true,
			"members.$.image":    user.Image,
		}}
		if _, err := DB.DB.Collection("Groups").UpdateOne(sc, groupFilter, groupUpdate); err != nil {
			return err
		}

		if _, err := DB.DB.Collection("Users").UpdateOne(sc, bson.M{"id":request.UserID}, 
		bson.M{"$push":bson.M{"groups":request.GroupID}}); err != nil {
			return err
		}

		openGroupColl := DB.DB.Collection("OpenGroups")
		if len(openGroup.Members) == 1 {
			if _, err := openGroupColl.DeleteOne(sc, bson.M{"groupID": request.GroupID}); err != nil {
				return err
			}
		} else {
			if _, err := openGroupColl.UpdateOne(sc,
				bson.M{"groupID": request.GroupID},
				bson.M{"$pull": bson.M{"members": bson.M{"id": request.MemberID}}},
			); err != nil {
				return err
			}
		}

 		return nil
	})

	if err != nil {
		return http.StatusInternalServerError, Type.Payload{Message: "伺服器錯誤"}
	}

	return http.StatusOK, Type.Payload{Message: "成功加入群組"}
}

func handleGetSettlement(w http.ResponseWriter, r *http.Request) {
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
		Utils.WriteJsonError(w, http.StatusBadRequest, Type.Payload{Message: "查無群組"})
		return
	}
	// 確認使用者在該群組
	flag := false
	for _, member := range group.Members {
		if member.UserID == userID {
			flag = true
			break
		}
	}
	if !flag {
		Utils.WriteJsonError(w, http.StatusForbidden, Type.Payload{Message: "使用者無權限"})
		return
	}

	expenses := make([]Type.Expense, 0, len(group.Expenses))
	findCtx, cancel := context.WithTimeout(context.Background(), time.Second*10)
	defer cancel()
	cursor, err := DB.DB.Collection("Expenses").Find(findCtx, bson.M{"id":bson.M{"$in":group.Expenses}})
	if err != nil {
		fmt.Println("error when finding expenses:", err.Error())
		Utils.WriteJsonError(w, http.StatusInternalServerError, Type.Payload{Message: "伺服器錯誤"})
		return
	}
	defer cursor.Close(findCtx)
	// decode all documents into the slice
	if err := cursor.All(findCtx, &expenses); err != nil {
		fmt.Println("error when decoding expenses cursor:", err.Error())
		Utils.WriteJsonError(w, http.StatusInternalServerError, Type.Payload{Message: "伺服器錯誤"})
		return
	}

	existingMember := make([]Type.Member, 0, len(group.Members))
	for _, member := range group.Members {
		if member.Joined {
			existingMember = append(existingMember, member)
		}
	}
	payments := make([]Type.Payment, 0)
	for _, expense := range expenses {
		receiverName := ""
		for _, member := range existingMember {
			if expense.ActualPayer == member.UserID {
				receiverName = member.Name
				break;
			}
		}

		if expense.Split {
			splitAmount := expense.Amount / float64(len(existingMember))
			splitAmount = math.Round(splitAmount*10) / 10
			for _, member := range existingMember {
				if member.UserID == expense.ActualPayer {
					continue
				}
				var payment Type.Payment
				payment.ExpenseID = expense.ID
				payment.ExpenseName = expense.Name
				payment.PayerID = member.UserID
				payment.PayerName = member.Name
				payment.ReceiverID = expense.ActualPayer
				payment.ReceiverName = receiverName
				payment.Date = expense.EditedAt
				payment.Amount = splitAmount
				payments = append(payments, payment)
			}
		} else {
			for _, payer := range expense.Payers {
				payment := Type.Payment{
					ExpenseID: expense.ID,
					ExpenseName: expense.Name,
					PayerID: payer.UserID,
					PayerName: payer.Name,
					ReceiverID: expense.ActualPayer,
					ReceiverName: receiverName,
					Date: expense.EditedAt,
					Amount: payer.Amount,
				}
				
				payments = append(payments, payment)
			}
		}
	}
	response := Type.GetSettlementResponse{
		GroupName: group.Name,
		GroupCreatorID: group.CreatorID,
		IsGroupSettled: group.Settled,
		Payments: payments,
	}
	
	Utils.WriteJsonSuccess(w, http.StatusOK, Type.Payload{Message: "取得結算資料成功", Data: response})
}

func handleSettleGroup(request Type.SettleGroupRequest) (int, Type.Payload) {
	user, err := Utils.GetUserByID(DB.DB, request.UserID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return http.StatusNotFound, Type.Payload{Field: "root", Message: "查無使用者"}
		}
		return http.StatusInternalServerError, Type.Payload{Field: "root", Message: "伺服器錯誤"}
	}
	group, err := Utils.GetGroupByID(DB.DB, request.GroupID)
	if err != nil {
		if errors.Is(err, mongo.ErrNoDocuments) {
			return http.StatusNotFound, Type.Payload{Field: "root", Message: "查無群組"}
		}
		return http.StatusInternalServerError, Type.Payload{Field: "root", Message: "伺服器錯誤"}
	}
	// 如果該群組已核銷
	if group.Settled {
		return http.StatusForbidden, Type.Payload{Field: "root", Message: "該群組已核銷"}
	}
	if group.CreatorID != user.ID {
		return http.StatusForbidden, Type.Payload{Field: "root", Message: "使用者無權限"}
	}
	// 如果該群組尚無花費
	if len(group.Expenses) == 0 {
		return http.StatusForbidden, Type.Payload{Field: "root", Message: "該群組尚無花費; 無法核銷"}
	}

	err = Utils.WithTransaction(DB.DB, func(sc mongo.SessionContext) error {
		// 查詢是否還有成員未加入(有則移除)
		nonJoinedMembers := make([]string, 0, len(group.Members))
		for _, member := range group.Members {
			if !member.Joined {
				nonJoinedMembers = append(nonJoinedMembers, member.ID)
			}
		}
		if len(nonJoinedMembers) > 0 {
			_, err = DB.DB.Collection("Groups").UpdateOne(sc, bson.M{"id":request.GroupID}, 
			bson.M{"$pull":bson.M{"members":bson.M{"id":bson.M{"$in":nonJoinedMembers}}}})
			if err != nil {
				return err
			}
		}
		// 刪除相對的openGroup(有則移除)
		_, err = DB.DB.Collection("OpenGroups").DeleteOne(sc, bson.M{"groupID":request.GroupID})
		if err != nil {
			return err
		}
		// 核銷
		_, err = DB.DB.Collection("Groups").UpdateOne(sc, bson.M{"id":request.GroupID}, 
		bson.M{"$set":bson.M{"settled":true}})
		if err != nil {
			return err
		}

		return nil
	})
	if err != nil {
		fmt.Println("核銷群組失敗:", err.Error())
		return http.StatusOK, Type.Payload{Field:"root", Message: "核銷群組失敗"}
	}

	data := Type.SettleGroupResponse{
		GroupID: group.ID,
	}
	return http.StatusOK, Type.Payload{Message: "核銷群組成功", Data: data}
}

func InitHandler() http.Handler {
	mux := http.NewServeMux()
	mux.HandleFunc("/", home)
	mux.HandleFunc("POST /createGroup", handle(handleCreateGroup))
	mux.HandleFunc("POST /deleteGroup", handle(handleDeleteGroup))
	mux.HandleFunc("/paginatedGroups/{offset}", handleViewPaginatedGroups)
	mux.HandleFunc("/group/{groupID}", handleViewGroup)
	mux.HandleFunc("/group/{groupID}/members", handleGetMembers)
	mux.HandleFunc("POST /addMembers", handle(handleAddMembers))
	mux.HandleFunc("POST /deleteMember", handle(handleDeleteMember))
	mux.HandleFunc("/getJoinGroupLink", handleGetJoinGroupLink)
	mux.HandleFunc("/getJoinGroupData/{openGroupID}/{groupID}/{userID}", handleGetJoinGroupData)
	mux.HandleFunc("POST /joinGroup", handle(handleJoinGroup))
	mux.HandleFunc("/group/{groupID}/joinedMembers", handleGetJoinedMembers)
	mux.HandleFunc("/group/{groupID}/settlement", handleGetSettlement)
	mux.HandleFunc("POST /settleGroup", handle(handleSettleGroup))
	
	return chainMiddleware(mux, EnableCORS, RateLimit, CheckAndValidateJWT)
}