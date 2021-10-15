package controllers

import (
	"database/sql"
	"net/http"

	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/server/validate"
	"github.com/abibby/nulls"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type UpdateUserBookRequest struct {
	BookID      string `url:"id"       validate:"uuid"`
	UserID      string `json:"user_id" validate:"uuid"`
	CurrentPage int    `json:"page"    validate:"min:0"`
}

func UserBookUpdate(rw http.ResponseWriter, r *http.Request) {
	req := &UpdateUserBookRequest{}
	err := validate.Run(r, req)
	if err != nil {
		sendError(rw, err)
		return
	}

	ub := &models.UserBook{}

	err = database.UpdateTx(r.Context(), func(tx *sqlx.Tx) error {
		err = tx.Get(ub, "select * from user_books where user_id = ? and book_id = ? limit 1", req.UserID, req.BookID)
		if err == sql.ErrNoRows {
		} else if err != nil {
			return err
		}
		ub.CurrentPage = nulls.NewInt(req.CurrentPage)
		ub.UserID = uuid.MustParse(req.UserID)
		ub.BookID = uuid.MustParse(req.BookID)
		models.Save(ub, tx)
		return nil
	})
	if err != nil {
		sendError(rw, err)
		return
	}

	sendJSON(rw, ub)
}
