package controllers

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/abibby/comicbox-3/config"
	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/models"
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
		sendError(rw, NewHttpError(401, fmt.Errorf("401 unauthorized")))
		return
	} else if err != nil {
		sendError(rw, err)
		return
	}

	err = bcrypt.CompareHashAndPassword(u.PasswordHash, []byte(req.Password))
	if err == bcrypt.ErrMismatchedHashAndPassword {
		sendError(rw, NewHttpError(401, fmt.Errorf("401 unauthorized")))
		return
	} else if err != nil {
		sendError(rw, err)
		return
	}

	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"exp":       time.Now().Add(time.Hour * 24).Unix(),
		"client_id": u.ID,
	}).SignedString(config.AppKey)
	if err != nil {
		sendError(rw, err)
		return
	}

	imageToken, err := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"exp":       time.Now().Add(time.Hour * 24).Unix(),
		"client_id": u.ID,
		"query":     true,
	}).SignedString(config.AppKey)
	if err != nil {
		sendError(rw, err)
		return
	}

	sendJSON(rw, &LoginResponse{
		Token:      token,
		ImageToken: imageToken,
	})
}

func AuthMiddleware(acceptQuery bool) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(rw http.ResponseWriter, r *http.Request) {
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
				sendError(rw, NewHttpError(401, fmt.Errorf("unauthorized")))
				return
			}

			claims, ok := token.Claims.(jwt.MapClaims)
			if !ok || !token.Valid {
				sendError(rw, NewHttpError(401, fmt.Errorf("unauthorized")))
				return
			}

			iQuery, _ := claims["query"]
			shouldUseQuery, _ := iQuery.(bool)

			if usingQuery != shouldUseQuery {
				sendError(rw, NewHttpError(401, fmt.Errorf("unauthorized")))
				return
			}

			if uid, ok := claims["client_id"]; ok {
				r = r.WithContext(context.WithValue(r.Context(), "user-id", uid))
			}

			next.ServeHTTP(rw, r)
		})
	}
}

func userID(r *http.Request) (uuid.UUID, bool) {
	iUserID := r.Context().Value("user-id")
	userID, ok := iUserID.(string)
	return uuid.MustParse(userID), ok
}
