package controllers

import (
	"fmt"
	"net/http"

	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/server/validate"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type UserCreateRequest struct {
	Username string `json:"username" validate:"require"`
	Password string `json:"password" validate:"require"`
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
		count := 0
		err = tx.Get(&count, "select count(*) from users where username = ?", u.Username)
		if err != nil {
			return err
		}
		if count > 0 {
			return validate.NewValidationError().
				Push("username", []error{fmt.Errorf("username is already in use")})
		}
		return models.Save(r.Context(), u, tx)
	})
	if err != nil {
		sendError(rw, err)
		return
	}

	sendJSON(rw, u)
}
