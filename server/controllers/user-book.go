package controllers

import (
	"database/sql"
	"fmt"
	"net/http"

	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/server/validate"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/pkg/errors"
)

type UpdateUserBookRequest struct {
	BookID      string            `url:"id"            validate:"uuid"`
	CurrentPage int               `json:"current_page" validate:"require|min:0" model:"current_page"`
	UpdateMap   map[string]string `json:"update_map"   validate:"require"`
}

func UserBookUpdate(rw http.ResponseWriter, r *http.Request) {
	req := &UpdateUserBookRequest{}
	err := validate.Run(r, req)
	if err != nil {
		sendError(rw, err)
		return
	}

	uid, ok := userID(r)
	if !ok {
		sendError(rw, NewHttpError(401, fmt.Errorf("unautherised")))
		return
	}

	ub := &models.UserBook{}

	err = database.UpdateTx(r.Context(), func(tx *sqlx.Tx) error {
		err = tx.Get(ub, "select * from user_books where user_id = ? and book_id = ? limit 1", uid, req.BookID)
		if err == sql.ErrNoRows {
		} else if err != nil {
			return errors.Wrap(err, "failed to retrieve user book from the database")
		}
		err = models.AfterLoad(ub, r.Context(), tx)
		if err != nil {
			return errors.Wrap(err, "failed to run after load hooks")
		}

		if shouldUpdate(ub.UpdateMap, req.UpdateMap, "current_page") {
			ub.CurrentPage = req.CurrentPage
		}

		ub.UserID = uid
		ub.BookID = uuid.MustParse(req.BookID)
		err = models.Save(r.Context(), ub, tx)
		return errors.Wrap(err, "")
	})
	if err != nil {
		sendError(rw, err)
		return
	}

	sendJSON(rw, ub)
}
