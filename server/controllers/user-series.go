package controllers

import (
	"database/sql"
	"fmt"
	"net/http"

	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/server/auth"
	"github.com/abibby/comicbox-3/server/validate"
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
		err = tx.Get(us, "select * from user_series where user_id = ? and series_name = ? limit 1", uid, req.SeriesName)
		if err == sql.ErrNoRows {
		} else if err != nil {
			return errors.Wrap(err, "failed to retrieve user series from the database")
		}
		err = models.AfterLoad(us, r.Context(), tx)
		if err != nil {
			return errors.Wrap(err, "failed to run after load hooks")
		}

		us.UserID = uid
		us.SeriesName = req.SeriesName

		if shouldUpdate(us.UpdateMap, req.UpdateMap, "list") {
			us.List = req.List
		}

		return models.Save(r.Context(), us, tx)
	})
	if err != nil {
		sendError(rw, err)
		return
	}

	sendJSON(rw, us)
}
