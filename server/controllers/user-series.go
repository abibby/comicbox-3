package controllers

import (
	"net/http"
	"time"

	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/server/auth"
	"github.com/abibby/comicbox-3/server/validate"
	"github.com/abibby/salusa/database/model"
	"github.com/jmoiron/sqlx"
	"github.com/pkg/errors"
)

type UserSeriesUpdateRequest struct {
	SeriesSlug string            `url:"slug"`
	List       models.List       `json:"list"`
	LastReadAt time.Time         `json:"last_read_at"`
	UpdateMap  map[string]string `json:"update_map" validate:"require"`
}

func UserSeriesUpdate(rw http.ResponseWriter, r *http.Request) {
	req := &UserSeriesUpdateRequest{}
	err := validate.Run(r, req)
	if err != nil {
		sendError(rw, err)
		return
	}

	uid, ok := auth.UserID(r.Context())
	if !ok {
		sendError(rw, ErrUnauthorized)
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
		if shouldUpdate(us.UpdateMap, req.UpdateMap, "last_read_at") {
			us.LastReadAt = database.Time(req.LastReadAt)
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
