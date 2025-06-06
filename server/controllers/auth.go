package controllers

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"slices"
	"strings"
	"time"

	"github.com/abibby/comicbox-3/config"
	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/server/auth"
	"github.com/abibby/comicbox-3/server/validate"
	"github.com/abibby/salusa/database/model"
	"github.com/abibby/salusa/openapidoc"
	"github.com/abibby/salusa/request"
	"github.com/abibby/salusa/router"
	"github.com/go-openapi/spec"
	"github.com/golang-jwt/jwt/v4"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"golang.org/x/crypto/bcrypt"
)

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Token        string `json:"token"`
	ImageToken   string `json:"image_token"`
	RefreshToken string `json:"refresh_token"`
}

func Login(rw http.ResponseWriter, r *http.Request) {
	req := &LoginRequest{}
	err := validate.Run(r, req)
	if err != nil {
		sendError(rw, err)
		return
	}

	var u *models.User
	err = database.ReadTx(r.Context(), func(tx *sqlx.Tx) error {
		var err error
		u, err = models.UserQuery(r.Context()).
			Where("username", "=", strings.ToLower(req.Username)).
			First(tx)
		return err
	})
	if err != nil {
		sendError(rw, err)
		return
	}
	if u == nil {
		sendError(rw, ErrUnauthorized)
		return
	}

	err = bcrypt.CompareHashAndPassword(u.PasswordHash, []byte(req.Password))
	if err == bcrypt.ErrMismatchedHashAndPassword {
		sendError(rw, ErrUnauthorized)
		return
	} else if err != nil {
		sendError(rw, err)
		return
	}

	resp, err := generateLoginResponse(u)
	if err != nil {
		sendError(rw, err)
		return
	}

	sendJSON(rw, resp)
}

func Refresh(rw http.ResponseWriter, r *http.Request) {
	uid, ok := auth.UserID(r.Context())
	if !ok {
		sendError(rw, ErrUnauthorized)
		return
	}

	var u *models.User
	err := database.ReadTx(r.Context(), func(tx *sqlx.Tx) error {
		var err error
		u, err = models.UserQuery(r.Context()).Find(tx, uid)
		return err
	})
	if err != nil {
		sendError(rw, err)
		return
	}

	if u == nil {
		sendError(rw, ErrUnauthorized)
		return
	}

	resp, err := generateLoginResponse(u)
	if err != nil {
		sendError(rw, err)
		return
	}

	sendJSON(rw, resp)
}

func generateLoginResponse(u *models.User) (*LoginResponse, error) {

	token, err := auth.GenerateToken(u.ID, auth.WithPurpose(auth.ScopeAPI))
	if err != nil {
		return nil, err
	}

	imageToken, err := auth.GenerateToken(u.ID, auth.WithPurpose(auth.ScopeImage))
	if err != nil {
		return nil, err
	}

	refreshToken, err := auth.GenerateToken(u.ID, auth.WithPurpose(auth.ScopeRefresh), auth.WithLifetime(time.Hour*24*30))
	if err != nil {
		return nil, err
	}

	return &LoginResponse{
		Token:        token,
		ImageToken:   imageToken,
		RefreshToken: refreshToken,
	}, nil
}

type UserCreateTokenResponse struct {
	Token string `json:"token"`
}

func UserCreateToken(rw http.ResponseWriter, r *http.Request) {
	token, err := auth.GenerateToken(uuid.UUID{}, auth.CreatesUser(uuid.New()))
	if err != nil {
		sendError(rw, err)
		return
	}

	sendJSON(rw, &UserCreateTokenResponse{
		Token: token,
	})
}

type ChangePasswordRequest struct {
	OldPassword string `json:"old_password"`
	NewPassword string `json:"new_password"`

	Ctx context.Context `inject:""`
}
type ChangePasswordResponse struct{}

var ChangePassword = request.Handler(func(r *ChangePasswordRequest) (*ChangePasswordResponse, error) {
	uid, ok := auth.UserID(r.Ctx)
	if !ok {
		return nil, ErrUnauthorized
	}

	err := database.ReadTx(r.Ctx, func(tx *sqlx.Tx) error {
		u, err := models.UserQuery(r.Ctx).Find(tx, uid)
		if err != nil {
			return err
		}

		err = bcrypt.CompareHashAndPassword(u.PasswordHash, []byte(r.OldPassword))
		if err == bcrypt.ErrMismatchedHashAndPassword {
			return ErrUnauthorized
		} else if err != nil {
			return err
		}

		u.Password = []byte(r.NewPassword)

		return model.SaveContext(r.Ctx, tx, u)
	})
	if err != nil {
		return nil, err
	}

	return &ChangePasswordResponse{}, nil
})

type authMiddleware struct {
	purposes []auth.TokenScope
}

func AttachUserMiddleware() router.InlineMiddlewareFunc {
	return func(w http.ResponseWriter, r *http.Request, next http.Handler) {
		r = attachUser(r)
		next.ServeHTTP(w, r)
	}
}

func HasScope(scopes ...auth.TokenScope) router.Middleware {
	return &authMiddleware{
		purposes: scopes,
	}
}

var _ router.Middleware = (*authMiddleware)(nil)
var _ openapidoc.OperationMiddleware = (*authMiddleware)(nil)

func (m *authMiddleware) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims, ok := auth.GetClaims(r.Context())
		if !ok {
			sendError(w, ErrUnauthorized)
			return
		}

		if len(m.purposes) <= 0 {
			next.ServeHTTP(w, r)
			return
		}
		for _, scope := range claims.Scope {
			if slices.Contains(m.purposes, auth.TokenScope(scope)) {
				next.ServeHTTP(w, r)
				return
			}
		}
		sendError(w, ErrUnauthorized)
	})
}
func (m *authMiddleware) OperationMiddleware(s *spec.Operation) *spec.Operation {
	if s.Security == nil {
		s.Security = []map[string][]string{}
	}
	securityDefinitionName := openapidoc.DefaultSecurityDefinitionName
	if slices.Contains(m.purposes, auth.ScopeImage) {
		securityDefinitionName = "Query"
	}
	s.Security = append(s.Security, map[string][]string{
		securityDefinitionName: {},
	})
	return s
}

func attachUser(r *http.Request) *http.Request {
	tokenStr := ""
	authHeader := r.Header.Get("Authorization")
	prefix := "Bearer "
	if strings.HasPrefix(authHeader, prefix) {
		tokenStr = authHeader[len(prefix):]
	} else {
		tokenStr = r.URL.Query().Get("_token")
	}

	if tokenStr == "" {
		return r
	}

	claims := &auth.Claims{}
	_, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
		// Don't forget to validate the alg is what you expect:
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}

		return config.AppKey, nil
	})
	if err != nil {
		slog.Error("failed to parse JWT", "err", err)
		return r
	}

	return auth.WithClaims(r, claims)
}
