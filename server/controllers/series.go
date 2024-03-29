package controllers

import (
	"net/http"

	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/server/auth"
	"github.com/abibby/comicbox-3/server/validate"
	"github.com/abibby/nulls"
	"github.com/abibby/salusa/database/builder"
	"github.com/abibby/salusa/database/dialects/sqlite"
	"github.com/abibby/salusa/database/model"
	"github.com/jmoiron/sqlx"
	"github.com/pkg/errors"
)

type SeriesOrder string

func (l SeriesOrder) Options() map[string]string {
	return map[string]string{
		"Name":     string(SeriesOrderName),
		"LastRead": string(SeriesOrderLastRead),
	}
}

const (
	SeriesOrderName     = SeriesOrder("name")
	SeriesOrderLastRead = SeriesOrder("last-read")
)

type SeriesIndexRequest struct {
	Name           *nulls.String `query:"name"`
	List           *nulls.String `query:"list"`
	WithLatestBook bool          `query:"with_latest_book"`
	Order          *SeriesOrder  `query:"order"`
}

func SeriesIndex(rw http.ResponseWriter, r *http.Request) {
	req := &SeriesIndexRequest{}
	err := validate.Run(r, req)
	if err != nil {
		sendError(rw, err)
		return
	}

	query := models.SeriesQuery(r.Context()).
		With("UserSeries")

	if req.Order != nil {
		switch *req.Order {
		case SeriesOrderLastRead:
			uid, ok := auth.UserID(r.Context())
			if ok {
				query = query.JoinOn("user_series", func(q *builder.Conditions) {
					q.WhereColumn("series.name", "=", "user_series.series_name").
						Where("user_series.user_id", "=", uid)
				}).OrderByDesc("user_series.last_read_at")
			}
		}
	}
	query = query.OrderBy("name")

	if name, ok := req.Name.Ok(); ok {
		query = query.Where("name", "=", name)
	}
	if list, ok := req.List.Ok(); ok {
		query = query.WhereHas("UserSeries", func(q *builder.SubBuilder) *builder.SubBuilder {
			return q.Where("list", "=", list)
		})
	}

	if req.WithLatestBook {
		uid, ok := auth.UserID(r.Context())
		if ok {
			query = query.
				AddSelectSubquery(
					models.BookQuery(r.Context()).
						Select("id").
						LeftJoinOn("user_books", func(q *builder.Conditions) {
							q.WhereColumn("books.id", "=", "user_books.book_id").
								Where("user_books.user_id", "=", uid)
						}).
						WhereColumn("books.series", "=", "series.name").
						And(func(q *builder.Conditions) {
							q.OrWhereRaw("user_books.current_page < (books.page_count - 1)").
								OrWhere("current_page", "=", nil)
						}).
						Where("books.page_count", ">", 1).
						OrderBy("sort").
						Limit(1),
					"latest_book_id",
				).
				With("LatestBook.UserBook")
		}
		println(query.ToSQL(&sqlite.SQLite{}))
	}

	index(rw, r, query, func(wl *builder.Conditions, updatedAfter *database.Time) {
		wl.OrWhereHas("UserSeries", func(q *builder.SubBuilder) *builder.SubBuilder {
			return q.Where("series.updated_at", ">=", updatedAfter)
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
		s, err = models.SeriesQuery(r.Context()).
			With("UserSeries").
			Find(tx, req.Name)
		if err != nil {
			return errors.Wrap(err, "failed to retrieve series from the database")
		}
		if s == nil {
			return Err404
		}

		if shouldUpdate(s.UpdateMap, req.UpdateMap, "anilist_id") {
			s.AnilistId = req.AnilistID
		}

		return model.SaveContext(r.Context(), tx, s)
	})
	if err != nil {
		sendError(rw, err)
		return
	}

	sendJSON(rw, s)
}
