package Type

type Request interface {
	GetUserID() string
}

type CreateGroupRequest struct {
	UserID string      `json:"userID" validate:"required"`
	Group  CreateGroup `json:"group" validate:"required"`
}

func (c CreateGroupRequest) GetUserID() string {
	return c.UserID
}

type DeleteGroupRequest struct {
	UserID  string `json:"userID" validate:"required"`
	GroupID string `json:"groupID" validate:"required"`
}

func (d DeleteGroupRequest) GetUserID() string {
	return d.UserID
}

type AddMembersRequest struct {
	UserID  string      `json:"userID" validate:"required"`
	GroupID string      `json:"groupID" validate:"required"`
	Members []AddMember `json:"members" validate:"required"`
}

func (a AddMembersRequest) GetUserID() string {
	return a.UserID
}

type DeleteMemberRequest struct {
	UserID   string `json:"userID"`
	GroupID  string `json:"groupID"`
	MemberID string `json:"memberID"`
}

func (d DeleteMemberRequest) GetUserID() string {
	return d.UserID
}

type JoinGroupRequest struct {
	ID       string `json:"id" validate:"required"` // id of the document in OpenGroups
	UserID   string `json:"userID" validate:"required"`
	GroupID  string `json:"groupID" validate:"required"`
	MemberID string `json:"memberID" validate:"required"`
}

func (j JoinGroupRequest) GetUserID() string {
	return j.UserID
}

type SettleGroupRequest struct {
	UserID  string `json:"userID"`
	GroupID string `json:"groupID"`
}

func (s SettleGroupRequest) GetUserID() string {
	return s.UserID
}