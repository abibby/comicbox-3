package controllers

import (
	"fmt"
	"net/http"

	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/server/auth"
	"github.com/abibby/comicbox-3/server/validate"
	"github.com/abibby/salusa/database/model"
	"github.com/jmoiron/sqlx"
	"github.com/pkg/errors"
)

type UpdateUserSeriesRequest struct {
	SeriesName string            `url:"name"`
	List       models.List       `json:"list"`
	UpdateMap  map[string]string `json:"update_map" validate:"require"`
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
			Where("series_name", "=", req.SeriesName).
			First(tx)
		if err != nil {
			return errors.Wrap(err, "failed to retrieve user book from the database")
		}
		if us == nil {
			us = &models.UserSeries{
				UserID:     uid,
				SeriesName: req.SeriesName,
			}
		}
		if shouldUpdate(us.UpdateMap, req.UpdateMap, "list") {
			us.List = req.List
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
