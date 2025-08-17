package Type

type Response struct {
	Type    string  `json:"type"`
	Payload Payload `json:"payload"`
}

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
type Payload struct {
	Field   string `json:"field"`
	Message string `json:"message"`
	Data    any    `json:"data"`
}

type GroupCard struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	CreatedAt   string `json:"createdAt"`
	CreatorID   string `json:"creatorID"`
	CreatorName string `json:"creatorName"`
	MemberCnt   int    `json:"memberCnt"`
	Settled     bool   `json:"settled"`
}

type GroupsResponse struct {
	GroupCards []GroupCard `json:"groupCards"`
	HaveMore   bool        `json:"haveMore"`
}

type GroupResponse struct {
	ID        string   `json:"id" bson:"id" validate:"required"`
	Name      string   `json:"name" bson:"name" validate:"required"`
	CreatedAt string   `json:"createdAt" bson:"createdAt"`
	CreatorID string   `json:"creatorID" bson:"creatorID"` // id of group creator
	Expenses  []string `json:"expenses" bson:"expenses"`
	Settled   bool     `json:"settled"`
}

type CreateGroupResponse struct {
	GroupID string `json:"groupID"`
}

type GetJoinedMembersResponse struct {
	GroupName string   `json:"groupName"`
	Members   []Member `json:"members"`
}

type GetJoinGroupLinkResponse struct {
	Link *string `json:"link"`
}

type GetJoinGroupDataResponse struct {
	GroupID   string            `json:"groupID"`
	GroupName string            `json:"groupName"`
	Members   []OpenGroupMember `json:"members"`
}

type GetSettlementResponse struct {
	GroupName      string    `json:"groupName"`
	GroupCreatorID string    `json:"groupCreatorID"`
	IsGroupSettled bool      `json:"isGroupSettled"`
	Payments       []Payment `json:"payments"`
}

type SettleGroupResponse struct {
	GroupID string `json:"groupID"`
}