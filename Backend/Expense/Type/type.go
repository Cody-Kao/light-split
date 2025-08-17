package Type

import (
	"bytes"
	"mime/multipart"
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
	CreatorID   string    `json:"creatorID" bson:"creatorID"`
	Members   	[]Member  `json:"members" bson:"members"`
	Expenses  	[]string `json:"expenses" bson:"expenses"`
	Settled 	bool	  `json:"settled" bson:"settled"`
}

type Member struct {
	ID           string `json:"id" bson:"id"`
	Name         string `json:"name" bson:"name"`
	UserID       string `json:"userID" bson:"userID"`
	UserName     string `json:"userName" bson:"userName"`
	Joined       bool   `json:"joined" bson:"joined"`
	Image 		string `json:"image" bson:"image"`
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

type CreateExpense struct {
	Name        string  `json:"name" bson:"name" validate:"required"`
	ActualPayer string  `json:"actualPayer" bson:"actualPayer" validate:"required"` // id of that user
	Amount 		float64 `json:"amount" bson:"amount" validate:"required"`
	Currency    string  `json:"currency" bson:"currency" validate:"required"`
	CreatorID     string  `json:"creatorID" bson:"creatorID" validate:"required"` // id of the creator
	Split       bool    `json:"split" bson:"split"`
	Payers      []Payer `json:"payers" bson:"payers" validate:"required"`
	Note 		string `json:"note" bson:"note"`
}

type Payer struct {
	ID       string  `json:"id" bson:"id"`
	UserID   string  `json:"userID" bson:"userID" validate:"required"`
	Name     string  `json:"name" bson:"name" validate:"required"`
	Amount   float64 `json:"amount" bson:"amount" validate:"required"`
}

type ValidationRule struct {
	Rule     *regexp.Regexp
	Func 	 func(string) bool
	ErrorMsg string
}

type ContextKeyType string

type ImageData struct {
	File    *bytes.Buffer
	Header  *multipart.FileHeader
	MIMEType string
}