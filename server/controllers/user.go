package controllers

import (
	"fmt"
	"net/http"

	"github.com/abibby/bob"
	"github.com/abibby/comicbox-3/config"
	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/server/validate"
	"github.com/davecgh/go-spew/spew"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type UserCreateRequest struct {
	Username string `json:"username" validate:"require"`
	Password string `json:"password" validate:"require"`
}

func UserCreate(rw http.ResponseWriter, r *http.Request) {
	r, claims, ok := authenticate(false, r)
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
		err = models.UserQuery(r.Context()).
			SelectFunction("count", "*").
			Where("username", "=", u.Username).
			OrWhere("id", "=", u.ID).
			LoadOne(tx, &count)
		if err != nil {
			return err
		}
		spew.Dump(count)
		if count > 0 {
			return validate.NewValidationError().
				Push("username", []error{fmt.Errorf("username is already in use")})
		}
		return bob.SaveContext(r.Context(), tx, u)
	})
	if err != nil {
		sendError(rw, err)
		return
	}

	sendJSON(rw, u)
}
