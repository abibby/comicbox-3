package controllers

import (
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
	"github.com/abibby/salusa/openapidoc"
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

	resp, err := generateLoginResponse(u)
	if err != nil {
		sendError(rw, err)
		return
	}

	sendJSON(rw, resp)
}

func generateLoginResponse(u *models.User) (*LoginResponse, error) {

	token, err := generateToken(u, withPurpose(auth.TokenAuthenticated))
	if err != nil {
		return nil, err
	}

	imageToken, err := generateToken(u, withPurpose(auth.TokenImage), allowQueryToken)
	if err != nil {
		return nil, err
	}

	refreshToken, err := generateToken(u, withPurpose(auth.TokenRefresh), withLifetime(time.Hour*24*30))
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
	token, err := generateToken(nil, createsUser(uuid.New()))
	if err != nil {
		sendError(rw, err)
		return
	}

	sendJSON(rw, &UserCreateTokenResponse{
		Token: token,
	})
}

type authMiddleware struct {
	acceptQuery bool
	purposes    []auth.TokenPurpose
}

func AttachUserMiddleware() router.InlineMiddlewareFunc {
	return func(w http.ResponseWriter, r *http.Request, next http.Handler) {
		r = attachUser(r)
		next.ServeHTTP(w, r)
	}
}

func AuthMiddleware(acceptQuery bool, purposes ...auth.TokenPurpose) router.Middleware {
	return &authMiddleware{
		acceptQuery: acceptQuery,
		purposes:    purposes,
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

		if len(m.purposes) > 0 {

			if !ok || !slices.Contains(m.purposes, claims.Purpose) {
				sendError(w, ErrUnauthorized)
				return
			}
		}

		next.ServeHTTP(w, r)
	})
}
func (m *authMiddleware) OperationMiddleware(s *spec.Operation) *spec.Operation {
	if s.Security == nil {
		s.Security = []map[string][]string{}
	}
	securityDefinitionName := openapidoc.DefaultSecurityDefinitionName
	if m.acceptQuery {
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
	usingQuery := false
	if strings.HasPrefix(authHeader, "Bearer ") {
		tokenStr = authHeader[7:]
	} else {
		tokenStr = r.URL.Query().Get("_token")
		if tokenStr != "" {
			usingQuery = true
		}
	}

	if tokenStr == "" {
		return r
	}

	claims := &auth.Claims{}
	_, err := jwt.ParseWithClaims(tokenStr, claims, func(token *jwt.Token) (interface{}, error) {
		// Don't forget to validate the alg is what you expect:
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("Unexpected signing method: %v", token.Header["alg"])
		}

		return config.AppKey, nil
	})
	if err != nil {
		slog.Error("failed to parse JWT", "err", err)
		return r
	}

	if usingQuery != claims.Query {
		return r
	}

	return auth.WithClaims(r, claims)
}

func generateToken(u *models.User, modifyClaims ...func(jwt.MapClaims) jwt.MapClaims) (string, error) {
	claims := jwt.MapClaims{
		"exp": time.Now().Add(time.Hour * 24).Unix(),
	}
	if u != nil {
		claims["client_id"] = u.ID
	}
	for _, m := range modifyClaims {
		claims = m(claims)
	}
	return jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString(config.AppKey)
}

func allowQueryToken(claims jwt.MapClaims) jwt.MapClaims {
	claims["query"] = true
	return claims
}

func createsUser(id uuid.UUID) func(claims jwt.MapClaims) jwt.MapClaims {
	return func(claims jwt.MapClaims) jwt.MapClaims {
		claims["new_client_id"] = id
		return claims
	}
}
func withPurpose(purpose auth.TokenPurpose) func(claims jwt.MapClaims) jwt.MapClaims {
	return func(claims jwt.MapClaims) jwt.MapClaims {
		claims["purpose"] = purpose
		return claims
	}
}
func withLifetime(duration time.Duration) func(claims jwt.MapClaims) jwt.MapClaims {
	return func(claims jwt.MapClaims) jwt.MapClaims {
		claims["exp"] = time.Now().Add(duration).Unix()
		return claims
	}
}
