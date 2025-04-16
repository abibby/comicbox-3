package controllers

import (
	"fmt"
	"net/http"

	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/server/auth"
	"github.com/abibby/comicbox-3/server/validate"
	"github.com/abibby/salusa/database/model"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/pkg/errors"
)

type UpdateUserSeriesRequest struct {
	SeriesSlug   string            `url:"slug"`
	List         models.List       `json:"list"`
	LatestBookID uuid.NullUUID     `json:"latest_book_id"`
	UpdateMap    map[string]string `json:"update_map" validate:"require"`
}

func UserSeriesUpdate(rw http.ResponseWriter, r *http.Request) {
	req := &UpdateUserSeriesRequest{}
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

	us := &models.UserSeries{}

	err = database.UpdateTx(r.Context(), func(tx *sqlx.Tx) error {
		var err error
		us, err = models.UserSeriesQuery(r.Context()).
			Where("series_name", "=", req.SeriesSlug).
			First(tx)
		if err != nil {
			return errors.Wrap(err, "failed to retrieve user book from the database")
		}
		if us == nil {
			us = &models.UserSeries{
				UserID:     uid,
				SeriesSlug: req.SeriesSlug,
			}
		}
		if shouldUpdate(us.UpdateMap, req.UpdateMap, "list") {
			us.List = req.List
		}

		if shouldUpdate(us.UpdateMap, req.UpdateMap, "latest_book_id") {
			us.LatestBookID = req.LatestBookID
		}

		err = model.SaveContext(r.Context(), tx, us)
		return errors.Wrap(err, "")
	})
	if err != nil {
		sendError(rw, err)
		return
	}

	sendJSON(rw, us)
}
