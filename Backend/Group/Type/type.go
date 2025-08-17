package Type

import (
	"regexp"
)

type User struct {
	ID        string `json:"id" bson:"id" validate:"required"`
	Name      string `json:"name" bson:"name" validate:"required"`
	CreatedAt string `json:"createdAt" bson:"createdAt"`
	Account   string `json:"account" bson:"account" validate:"required"`
	Password  string `json:"password" bson:"password" validate:"required"`
	Image     string `json:"image" bson:"image"`
	IsGoogle  bool   `json:"isGoogle" bson:"isGoogle"`
	Groups 	  []string `json:"groups" bson:"groups"`
}

type Group struct {
	ID        	string    `json:"id" bson:"id" validate:"required"`
	Name      	string    `json:"name" bson:"name" validate:"required"`
	CreatedAt 	string    `json:"createdAt" bson:"createdAt"`
	CreatorID   string    `json:"creatorID" bson:"creatorID"` // id of group creator
	Members   	[]Member  `json:"members" bson:"members"`
	Expenses  	[]string  `json:"expenses" bson:"expenses"`
	Settled 	bool	  `json:"settled" bson:"settled"`
}

type CreateGroup struct {
	Name    string   `json:"name" bson:"name" validate:"required"`
	CreatorName string `json:"creatorName" bson:"creatorName" validate:"required"`
	Members []Member `json:"members" bson:"members" validate:"required"`
}

type Expense struct {
	ID          string  `json:"id" bson:"id"`
	Name        string  `json:"name" bson:"name"`
	ActualPayer string  `json:"actualPayer" bson:"actualPayer"`
	Amount 		float64 `json:"amount" bson:"amount"`
	Currency    string  `json:"currency" bson:"currency"`
	Image       string  `json:"image" bson:"image"`
	EditedAt    string  `json:"editedAt" bson:"editedAt"`
	CreatorID     string  `json:"creatorID" bson:"creatorID"` // id of creator
	GroupID 	string `json:"groupID" bson:"groupID"`
	Split       bool    `json:"split" bson:"split"`
	Payers      []Payer `json:"payers" bson:"payers"`
	Note 		string `json:"note" bson:"note"`
}

type Member struct {
	ID           string `json:"id" bson:"id"`
	Name         string `json:"name" bson:"name"`
	UserID       string `json:"userID" bson:"userID"`
	UserName     string `json:"userName" bson:"userName"`
	Joined       bool   `json:"joined" bson:"joined"`
	Image 		string `json:"image" bson:"image"`
}

type Payer struct {
	ID       string  `json:"id" bson:"id"`
	UserID   string  `json:"userID" bson:"userID"`
	Name     string  `json:"name" bson:"name"`
	Amount   float64 `json:"amount" bson:"amount"`
}

type OpenGroup struct {
	ID 		string `json:"id" bson:"id"`
	GroupID string `json:"groupID" bson:"groupID"`
	Members []OpenGroupMember `json:"members" bson:"members"`
}
type OpenGroupMember struct {
	ID           string `json:"id" bson:"id"`
	Name         string `json:"name" bson:"name"`
}
type AddMember struct {
	Name string `json:"name"`
}

type ValidationRule struct {
	Rule     *regexp.Regexp
	Func 	 func(string) bool
	ErrorMsg string
}

type ContextKeyType string

type Payment struct {
	ExpenseID string `json:"expenseID"`
	ExpenseName string `json:"expenseName"`
	PayerID string `json:"payerID"`
	PayerName string `json:"payerName"`
	ReceiverID string `json:"receiverID"`
	ReceiverName string `json:"receiverName"`
	Date string `json:"date"`
	Amount float64 `json:"amount"`
}
