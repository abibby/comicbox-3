package controllers

import (
	"database/sql"
	"fmt"
	"net/http"
	"time"

	"github.com/abibby/comicbox-3/config"
	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/server/validate"
	jwt "github.com/golang-jwt/jwt/v4"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"golang.org/x/crypto/bcrypt"
)

type UserCreateRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

func UserCreate(rw http.ResponseWriter, r *http.Request) {
	req := &UserCreateRequest{}
	err := validate.Run(r, req)
	if err != nil {
		sendError(rw, err)
		return
	}

	u := &models.User{
		ID:       uuid.New(),
		Username: req.Username,
		Password: []byte(req.Password),
	}
	err = database.UpdateTx(r.Context(), func(tx *sqlx.Tx) error {
		return models.Save(u, tx)
	})
	if err != nil {
		sendError(rw, err)
		return
	}

	sendJSON(rw, u)
}

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
		"client_id": u.ID,
		"exp":       time.Now().Add(time.Hour * 24),
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
