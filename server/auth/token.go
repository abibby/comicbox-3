package auth

import (
	"time"

	"github.com/abibby/comicbox-3/config"
	"github.com/abibby/salusa/auth"
	"github.com/golang-jwt/jwt/v4"
	"github.com/google/uuid"
)

// https://www.iana.org/assignments/jwt/jwt.xhtml#claims
func GenerateToken(userID uuid.UUID, modifyClaims ...func(*Claims) *Claims) (string, error) {
	return jwt.NewWithClaims(jwt.SigningMethodHS256, GenerateClaims(userID, modifyClaims...)).SignedString(config.AppKey)
}

// https://www.iana.org/assignments/jwt/jwt.xhtml#claims
func GenerateClaims(userID uuid.UUID, modifyClaims ...func(*Claims) *Claims) *Claims {
	now := time.Now()
	claims := &Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   userID.String(),
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(time.Hour * 24)),
		},
	}
	for _, m := range modifyClaims {
		claims = m(claims)
	}
	return claims
}

func CreatesUser(id uuid.UUID) func(claims *Claims) *Claims {
	return func(claims *Claims) *Claims {
		claims.NewClientID.UUID = id
		claims.NewClientID.Valid = true

		return claims
	}
}
func WithScope(purpose ...TokenScope) func(claims *Claims) *Claims {
	scopes := make(auth.ScopeStrings, len(purpose))
	for i, v := range purpose {
		scopes[i] = string(v)
	}
	return func(claims *Claims) *Claims {
		claims.Scope = scopes
		return claims
	}
}
func WithLifetime(duration time.Duration) func(claims *Claims) *Claims {
	return func(claims *Claims) *Claims {
		claims.ExpiresAt = jwt.NewNumericDate(time.Now().Add(duration))
		return claims
	}
}
