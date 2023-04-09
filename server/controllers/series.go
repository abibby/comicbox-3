package controllers

import (
	"database/sql"
	"net/http"

	"github.com/abibby/bob"
	"github.com/abibby/bob/selects"
	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/server/validate"
	"github.com/abibby/nulls"
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
	query := models.SeriesQuery(r.Context()).
		With("UserSeries").
		OrderBy("name")

	if name, ok := req.Name.Ok(); ok {
		query = query.Where("name", "=", name)
	}
	if list, ok := req.List.Ok(); ok {
		query = query.WhereHas("UserSeries", func(q *selects.SubBuilder) *selects.SubBuilder {
			return q.Where("list", "=", list)
		})
	}

	index(rw, r, query, func(wl *selects.WhereList, updatedAfter *database.Time) {
		wl.OrWhereHas("UserSeries", func(q *selects.SubBuilder) *selects.SubBuilder {
			return q.Where("updated_at", ">=", updatedAfter)
		})
	})
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
		var err error
		s, err = models.SeriesQuery(r.Context()).Find(tx, req.Name)
		if err == sql.ErrNoRows {
			return Err404
		} else if err != nil {
			return errors.Wrap(err, "failed to retrieve series from the database")
		}

		if shouldUpdate(s.UpdateMap, req.UpdateMap, "anilist_id") {
			s.AnilistId = req.AnilistID
		}

		return bob.SaveContext(r.Context(), tx, s)
	})
	if err != nil {
		sendError(rw, err)
		return
	}

	sendJSON(rw, s)
}
