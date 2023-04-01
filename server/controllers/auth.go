package controllers

import (
	"database/sql"
	"fmt"
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/abibby/comicbox-3/config"
	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/server/auth"
	"github.com/abibby/comicbox-3/server/validate"
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

type TokenPurpose string

const (
	TokenAuthenticated = TokenPurpose("authenticated")
	TokenRefresh       = TokenPurpose("refresh")
	TokenImage         = TokenPurpose("image")
)

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
		u, err = models.UserQuery().
			WhereRaw("lower(username) = ?", strings.ToLower(req.Username)).
			First(tx)
		return err
	})
	if err == sql.ErrNoRows {
		sendError(rw, ErrUnauthorized)
		return
	} else if err != nil {
		sendError(rw, err)
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
		u, err = models.UserQuery().FindContext(r.Context(), tx, uid)
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

	token, err := generateToken(u, withPurpose(TokenAuthenticated))
	if err != nil {
		return nil, err
	}

	imageToken, err := generateToken(u, withPurpose(TokenImage), allowQueryToken)
	if err != nil {
		return nil, err
	}

	refreshToken, err := generateToken(u, withPurpose(TokenRefresh), withLifetime(time.Hour*24*30))
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

func AuthMiddleware(acceptQuery bool, purposes ...TokenPurpose) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(rw http.ResponseWriter, r *http.Request) {
			ok, claims := authenticate(acceptQuery, r)
			if !ok {
				sendError(rw, ErrUnauthorized)
				return
			}

			if len(purposes) > 0 {
				iPurpose, ok := claims["purpose"]
				if !ok {
					sendError(rw, ErrUnauthorized)
					return
				}
				purpose, ok := iPurpose.(string)
				if !ok || !hasPurpose(purposes, TokenPurpose(purpose)) {
					sendError(rw, ErrUnauthorized)
					return
				}
			}

			next.ServeHTTP(rw, r)
		})
	}
}

func hasPurpose(haystack []TokenPurpose, needle TokenPurpose) bool {
	for _, p := range haystack {
		if needle == p {
			return true
		}
	}
	return false
}

func authenticate(acceptQuery bool, r *http.Request) (bool, jwt.MapClaims) {
	tokenStr := ""
	authHeader := r.Header.Get("Authorization")
	if strings.HasPrefix(authHeader, "Bearer ") {
		tokenStr = authHeader[7:]
	}

	usingQuery := acceptQuery && r.URL.Query().Has("_token")
	if usingQuery {
		tokenStr = r.URL.Query().Get("_token")
	}

	token, err := jwt.Parse(tokenStr, func(token *jwt.Token) (interface{}, error) {
		// Don't forget to validate the alg is what you expect:
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("Unexpected signing method: %v", token.Header["alg"])
		}

		return config.AppKey, nil
	})
	if err != nil {
		log.Printf("failed to parse JWT: %v", err)
		return false, nil
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok || !token.Valid {
		return false, nil
	}

	iQuery, _ := claims["query"]
	shouldUseQuery, _ := iQuery.(bool)

	if usingQuery != shouldUseQuery {
		return false, nil
	}

	if uid, ok := claims["client_id"]; ok {
		userID, err := uuid.Parse(uid.(string))
		if err != nil {
			log.Printf("failed to parse UID: %v", err)
			return false, nil
		}
		auth.SetUserID(r, userID)
	}
	return true, claims
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
func withPurpose(purpose TokenPurpose) func(claims jwt.MapClaims) jwt.MapClaims {
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
