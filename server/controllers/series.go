package controllers

import (
	"database/sql"
	"net/http"

	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/server/auth"
	"github.com/abibby/comicbox-3/server/validate"
	"github.com/abibby/nulls"
	"github.com/doug-martin/goqu/v9"
	"github.com/doug-martin/goqu/v9/exp"
	"github.com/jmoiron/sqlx"
	"github.com/pkg/errors"
)

type SeriesIndexRequest struct {
	Name *nulls.String `query:"name"`
	List *nulls.String `query:"list"`
}

func SeriesIndex(rw http.ResponseWriter, r *http.Request) {
	req := &SeriesIndexRequest{}
	err := validate.Run(r, req)
	if err != nil {
		sendError(rw, err)
		return
	}

	query := goqu.
		From("series").
		Select(&models.Series{}).
		Order(goqu.I("name").Asc())

	if name, ok := req.Name.Ok(); ok {
		query = query.Where(goqu.Ex{"name": name})
	}

	if uid, ok := auth.UserID(r.Context()); ok {
		if list, ok := req.List.Ok(); ok {
			query = query.Where(
				goqu.L("(select list from user_series where series_name=series.name and user_id=?)", uid).Eq(list),
			)
		}
	}

	exprs := []exp.Comparable{}
	uid, ok := auth.UserID(r.Context())
	if ok {
		exprs = append(exprs, goqu.L("(select updated_at from user_series where series_name=series.name and user_id=?)", uid))
	}

	index(rw, r, query, &models.SeriesList{}, exprs...)
}

type SeriesUpdateRequest struct {
	Name      string            `url:"name"`
	AnilistID *nulls.Int        `json:"anilist_id"`
	UpdateMap map[string]string `json:"update_map"   validate:"require"`
}

func SeriesUpdate(rw http.ResponseWriter, r *http.Request) {
	req := &SeriesUpdateRequest{}
	err := validate.Run(r, req)
	if err != nil {
		sendError(rw, err)
		return
	}

	s := &models.Series{}

	err = database.UpdateTx(r.Context(), func(tx *sqlx.Tx) error {
		err := models.Find(r.Context(), tx, s, req.Name)
		if err == sql.ErrNoRows {
			return Err404
		} else if err != nil {
			return errors.Wrap(err, "failed to retrieve series from the database")
		}

		if shouldUpdate(s.UpdateMap, req.UpdateMap, "anilist_id") {
			s.AnilistId = req.AnilistID
		}

		return models.Save(r.Context(), s, tx)
	})
	if err != nil {
		sendError(rw, err)
		return
	}

	sendJSON(rw, s)
}
