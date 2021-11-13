package controllers

import (
	"database/sql"
	"fmt"
	"net/http"
	"strconv"
	"strings"
	"time"

	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/server/validate"
	"github.com/davecgh/go-spew/spew"
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
			return errors.Wrap(err, "")
		}
		err = models.AfterLoad(ub, r.Context(), tx)
		if err != nil {
			return errors.Wrap(err, "")
		}

		if shouldUpdate(ub.UpdateMap, req.UpdateMap, "current_page") {
			spew.Dump("should update")
			ub.CurrentPage = req.CurrentPage
		}
		spew.Dump(ub.UpdateMap)
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

func shouldUpdate(current, updated map[string]string, field string) bool {
	u, hasUpdate := updated[field]
	if hasUpdate {
		timestamp, err := strconv.Atoi(strings.Split(u, "-")[0])
		if err != nil {
			return false
		}
		if time.Now().Add(time.Minute).Unix() < int64(timestamp/1000) {
			return false
		}
	}

	c, hasCurrent := current[field]
	if !hasCurrent {
		current[field] = updated[field]
		return true
	}
	if !hasUpdate {
		return false
	}

	if u <= c {
		return false
	}

	current[field] = updated[field]

	return true
}
