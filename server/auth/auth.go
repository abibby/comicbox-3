package auth

import (
	"context"
	"net/http"

	"github.com/golang-jwt/jwt/v4"
	"github.com/google/uuid"
)

type Claims struct {
	jwt.RegisteredClaims
	ClientID    uuid.UUID    `json:"client_id,omitempty"`
	Query       bool         `json:"query,omitempty"`
	Purpose     TokenPurpose `json:"purpose,omitempty"`
	NewClientID uuid.UUID    `json:"new_client_id,omitempty"`
}

type TokenPurpose string

const (
	TokenAuthenticated = TokenPurpose("authenticated")
	TokenRefresh       = TokenPurpose("refresh")
	TokenImage         = TokenPurpose("image")
)

type contextKey uint8

const (
	claimsKey = contextKey(iota)
)

func UserID(ctx context.Context) (uuid.UUID, bool) {
	c, ok := GetClaims(ctx)
	if !ok {
		return uuid.UUID{}, false
	}
	return c.ClientID, true
}
func GetClaims(ctx context.Context) (*Claims, bool) {
	iClaims := ctx.Value(claimsKey)
	if iClaims == nil {
		return nil, false
	}
	userID, _ := iClaims.(*Claims)
	return userID, userID != nil
}

func WithClaims(r *http.Request, claims jwt.Claims) *http.Request {
	return r.WithContext(context.WithValue(r.Context(), claimsKey, claims))
}
