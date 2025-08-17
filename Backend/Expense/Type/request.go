package Type

type Request interface {
	GetUserID() string
}

type CreateExpenseRequest struct {
	UserID  string        `json:"userID" validate:"required"`
	GroupID string        `json:"groupID" validate:"required"`
	Expense CreateExpense `json:"expense" validate:"required"`
}

func (c CreateExpenseRequest) GetUserID() string {
	return c.UserID
}

type DeleteExpenseRequest struct {
	UserID    string `json:"userID" validate:"required"`
	GroupID   string `json:"groupID" validate:"required"`
	ExpenseID string `json:"expenseID" validate:"required"`
}

func (d DeleteExpenseRequest) GetUserID() string {
	return d.UserID
}

type JoinGroupRequest struct {
	UserID   string `json:"userID" validate:"required"`
	GroupID  string `json:"groupID" validate:"required"`
	MemberID string `json:"memberID" validate:"required"`
}

func (j JoinGroupRequest) GetUserID() string {
	return j.UserID
}

type UpdateExpenseRequest struct {
	UserID        string   `json:"userID" validate:"required"`
	GroupID       string   `json:"groupID" validate:"required"`
	ExpenseID     string   `json:"expenseID" validate:"required"`
	ExpenseName   string   `json:"expenseName"`
	Amount        float64  `json:"amount"`
	ActualPayerID string   `json:"actualPayerId"`
	Currency      string   `json:"currency"`
	Split         bool     `json:"split" `
	Note          string   `json:"note"`
	Remove        []string `json:"remove"`
	Add           []Payer  `json:"add"`
	Update        []Payer  `json:"update"`
}

func (u UpdateExpenseRequest) GetUserID() string {
	return u.UserID
}

type ChangeProfileImageRequest struct {
	UserID string `json:"userID" validate:"required"`
}

func (c ChangeProfileImageRequest) GetUserID() string {
	return c.UserID
}