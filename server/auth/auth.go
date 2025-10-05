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

	ScopeAdmin = TokenScope("admin")

	ScopeUserIndex  = TokenScope("user:index")
	ScopeUserRead   = TokenScope("user:read")
	ScopeUserWrite  = TokenScope("user:write")
	ScopeUserDelete = TokenScope("user:delete")

	ScopeBookIndex  = TokenScope("book:index")
	ScopeBookRead   = TokenScope("book:read")
	ScopeBookWrite  = TokenScope("book:write")
	ScopeBookDelete = TokenScope("book:delete")
	ScopeBookSync   = TokenScope("book:sync")

	ScopeSeriesIndex = TokenScope("series:index")
	ScopeSeriesRead  = TokenScope("series:read")
	ScopeSeriesWrite = TokenScope("series:write")
	// ScopeSeriesDelete = TokenScope("series:delete")

	// ScopeUserBookIndex  = TokenScope("userbook:index")
	// ScopeUserBookRead   = TokenScope("userbook:read")
	ScopeUserBookWrite = TokenScope("userbook:write")
	// ScopeUserBookDelete = TokenScope("userbook:delete")

	// ScopeUserSeriesIndex  = TokenScope("userseries:index")
	// ScopeUserSeriesRead   = TokenScope("userseries:read")
	ScopeUserSeriesWrite = TokenScope("userseries:write")
	// ScopeUserSeriesDelete = TokenScope("userseries:delete")
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
