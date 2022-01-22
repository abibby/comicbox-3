package controllers

import (
	"database/sql"
	"fmt"
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
	Token      string `json:"token"`
	ImageToken string `json:"image_token"`
}

var (
	ErrUnauthorized = NewHttpError(401, fmt.Errorf("unauthorized"))
)

func Login(rw http.ResponseWriter, r *http.Request) {
	req := &LoginRequest{}
	err := validate.Run(r, req)
	if err != nil {
		sendError(rw, err)
		return
	}

	u := &models.User{}
	err = database.ReadTx(r.Context(), func(tx *sqlx.Tx) error {
		return tx.Get(u, "select * from users where lower(username) = ? limit 1", strings.ToLower(req.Username))
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

	token, err := generateToken(u)
	if err != nil {
		sendError(rw, err)
		return
	}

	imageToken, err := generateToken(u, allowQueryToken)
	if err != nil {
		sendError(rw, err)
		return
	}

	sendJSON(rw, &LoginResponse{
		Token:      token,
		ImageToken: imageToken,
	})
}

type UserCreateTokenResponse struct {
	Token string `json:"token"`
}

func UserCreateToken(rw http.ResponseWriter, r *http.Request) {
	token, err := generateToken(nil, allowQueryToken, createsUser(uuid.New()))
	if err != nil {
		sendError(rw, err)
		return
	}

	sendJSON(rw, &UserCreateTokenResponse{
		Token: token,
	})
}

func AuthMiddleware(acceptQuery bool, scopes ...string) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(rw http.ResponseWriter, r *http.Request) {
			ok, _ := authenticate(acceptQuery, r)
			if !ok {
				sendError(rw, ErrUnauthorized)
				return
			}

			next.ServeHTTP(rw, r)
		})
	}
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
