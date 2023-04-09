package controllers

import (
	"fmt"
	"net/http"

	"github.com/abibby/bob"
	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/server/auth"
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

	uid, ok := auth.UserID(r.Context())
	if !ok {
		sendError(rw, NewHttpError(401, fmt.Errorf("unautherised")))
		return
	}

	ub := &models.UserBook{}

	err = database.UpdateTx(r.Context(), func(tx *sqlx.Tx) error {
		var err error
		ub, err = models.UserBookQuery(r.Context()).
			Where("book_id", "=", req.BookID).
			First(tx)
		if err != nil {
			return errors.Wrap(err, "failed to retrieve user book from the database")
		}
		if ub == nil {
			ub = &models.UserBook{
				UserID: uid,
				BookID: uuid.MustParse(req.BookID),
			}
		}
		if shouldUpdate(ub.UpdateMap, req.UpdateMap, "current_page") {
			ub.CurrentPage = req.CurrentPage
		}

		err = bob.SaveContext(r.Context(), tx, ub)
		return errors.Wrap(err, "")
	})
	if err != nil {
		sendError(rw, err)
		return
	}

	sendJSON(rw, ub)
}
