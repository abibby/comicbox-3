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
	"github.com/abibby/comicbox-3/server/validate"
	"github.com/davecgh/go-spew/spew"
	"github.com/golang-jwt/jwt/v4"
	"github.com/jmoiron/sqlx"
	"golang.org/x/crypto/bcrypt"
)

type LoginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

type LoginResponse struct {
	Token string `json:"token"`
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
		return tx.Get(u, "select * from users where username = ? limit 1", req.Username)
	})
	if err == sql.ErrNoRows {
		sendError(rw, NewHttpError(401, fmt.Errorf("401 unauthorized")))
		return
	} else if err != nil {
		sendError(rw, err)
		return
	}

	err = bcrypt.CompareHashAndPassword(u.PasswordHash, []byte(req.Password))
	if err != nil {
		sendError(rw, err)
		return
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, jwt.MapClaims{
		"exp":       time.Now().Add(time.Hour * 24).Unix(),
		"client_id": u.ID,
	})

	t, err := token.SignedString(config.AppKey)
	if err != nil {
		sendError(rw, err)
		return
	}
	sendJSON(rw, &LoginResponse{
		Token: t,
	})
}

func AuthMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(rw http.ResponseWriter, r *http.Request) {
		tokenStr := ""
		authHeader := r.Header.Get("Authorization")
		if strings.HasPrefix(authHeader, "Bearer ") {
			tokenStr = authHeader[7:]
		}

		if r.URL.Query().Has("_token") {
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
			sendError(rw, NewHttpError(401, fmt.Errorf("unauthorized: %v", err)))
			return
		}
		claims, ok := token.Claims.(jwt.MapClaims)
		if !ok || !token.Valid {
			sendError(rw, NewHttpError(401, fmt.Errorf("unauthorized invalid")))
			return
		}

		spew.Dump(claims)

		if url, ok := claims["url"]; ok {
			if r.URL.String() != url {
				sendError(rw, NewHttpError(401, fmt.Errorf("unauthorized wrong url")))
				return
			}
		}

		next.ServeHTTP(rw, r)
	})
}
