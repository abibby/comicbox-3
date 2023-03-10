package controllers

import (
	"fmt"
	"net/http"

	"github.com/abibby/comicbox-3/config"
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
	ok, claims := authenticate(false, r)
	if !ok && !config.PublicUserCreate {
		sendError(rw, ErrUnauthorized)
		return
	}

	req := &UserCreateRequest{}
	err := validate.Run(r, req)
	if err != nil {
		sendError(rw, err)
		return
	}

	id := uuid.New()
	iID, ok := claims["new_client_id"]
	if !ok && claims != nil {
		sendError(rw, ErrUnauthorized)
		return
	} else if ok {
		strID, _ := iID.(string)
		id, err = uuid.Parse(strID)
		if err != nil {
			sendError(rw, err)
			return
		}
	}

	u := &models.User{
		ID:       id,
		Username: req.Username,
		Password: []byte(req.Password),
	}
	err = database.UpdateTx(r.Context(), func(tx *sqlx.Tx) error {
		count := 0
		err = tx.Get(&count, "select count(*) from users where username = ? or id = ?", u.Username, u.ID)
		if err != nil {
			return err
		}
		if count > 0 {
			return validate.NewValidationError().
				Push("username", []error{fmt.Errorf("username is already in use")})
		}
		return models.Save(r.Context(), tx, u)
	})
	if err != nil {
		sendError(rw, err)
		return
	}

	sendJSON(rw, u)
}
