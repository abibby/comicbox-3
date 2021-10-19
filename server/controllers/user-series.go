package controllers

import (
	"database/sql"
	"fmt"
	"net/http"

	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/server/validate"
	"github.com/abibby/nulls"
	"github.com/jmoiron/sqlx"
)

type UpdateUserSeriesRequest struct {
	SeriesName string        `url:"name"`
	List       *nulls.String `json:"list" validate:"in:planning,reading,paused,dropped,completed"`
}

func UserSeriesUpdate(rw http.ResponseWriter, r *http.Request) {
	req := &UpdateUserSeriesRequest{}
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

	ub := &models.UserSeries{}

	err = database.UpdateTx(r.Context(), func(tx *sqlx.Tx) error {
		err = tx.Get(ub, "select * from user_series where user_id = ? and series_name = ? limit 1", uid, req.SeriesName)
		if err == sql.ErrNoRows {
		} else if err != nil {
			return err
		}
		ub.List = req.List
		ub.UserID = uid
		ub.SeriesName = req.SeriesName
		return models.Save(r.Context(), ub, tx)
	})
	if err != nil {
		sendError(rw, err)
		return
	}

	sendJSON(rw, ub)
}
