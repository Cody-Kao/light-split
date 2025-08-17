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

type ExpenseCard struct {
	ID          string `json:"id"`
	Name        string `json:"name"`
	EditedAt    string `json:"editedAt"`
	CreatorName string `json:"creatorName"`
}

type GroupExpenses struct {
	ExpenseCards []ExpenseCard `json:"expenseCards"`
	HaveMore     bool          `json:"haveMore"`
}