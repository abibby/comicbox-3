package auth

import (
	"context"
	"net/http"

	"github.com/abibby/salusa/auth"
	"github.com/abibby/salusa/clog"
	"github.com/golang-jwt/jwt/v4"
	"github.com/google/uuid"
)

type Claims struct {
	jwt.RegisteredClaims
	Scope       auth.ScopeStrings `json:"scope,omitempty"`
	NewClientID uuid.NullUUID     `json:"new_client_id,omitempty"`
}

type TokenScope string

const (
	ScopeAPI     = TokenScope("api")
	ScopeRefresh = TokenScope("refresh")
	ScopeImage   = TokenScope("image")
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
	id, err := uuid.Parse(c.Subject)
	if err != nil {
		clog.Use(ctx).Warn("Failed to parse JWT subject", "err", err)
		return uuid.UUID{}, false
	}
	return id, true
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
	return r.WithContext(ContextWithClaims(r.Context(), claims))
}
func ContextWithClaims(ctx context.Context, claims jwt.Claims) context.Context {
	return context.WithValue(ctx, claimsKey, claims)
}
