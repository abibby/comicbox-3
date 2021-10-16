package controllers

import (
	"net/http"

	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/server/validate"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
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
		return models.Save(r.Context(), u, tx)
	})
	if err != nil {
		sendError(rw, err)
		return
	}

	sendJSON(rw, u)
}
