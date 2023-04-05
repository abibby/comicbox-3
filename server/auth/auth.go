package auth

import (
	"context"
	"log"
	"net/http"

	"github.com/google/uuid"
)

func UserID(ctx context.Context) (uuid.UUID, bool) {
	iUserID := ctx.Value("user-id")
	userID, ok := iUserID.(uuid.UUID)
	if !ok {
		log.Printf("Invalid user uuid: '%#s'", iUserID)
		return uuid.UUID{}, false
	}
	return userID, ok
}

func SetUserID(r *http.Request, uid uuid.UUID) *http.Request {
	return r.WithContext(context.WithValue(r.Context(), "user-id", uid))
}
