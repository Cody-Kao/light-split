package Type

type RegisterRequest struct {
	Name            string `json:"name" validate:"required"`
	Account         string `json:"account" validate:"required"`
	Password        string `json:"password" validate:"required"`
	ConfirmPassword string `json:"confirmPassword" validate:"required"`
}

type LoginRequest struct {
	Account  string `json:"account" validate:"required"`
	Password string `json:"password" validate:"required"`
}

type LogoutRequest struct {
	UserID string `json:"userID" validate:"required"`
}