package controllers

import (
	"context"

	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/server/auth"
	"github.com/abibby/nulls"
	"github.com/abibby/salusa/database/builder"
	"github.com/abibby/salusa/database/model"
	"github.com/abibby/salusa/request"
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
	PaginatedRequest

	Name           *nulls.String `query:"name"`
	List           *nulls.String `query:"list"`
	WithLatestBook bool          `query:"with_latest_book"`
	Order          *SeriesOrder  `query:"order"`

	Ctx context.Context `inject:""`
}

var SeriesIndex = request.Handler(func(req *SeriesIndexRequest) (*PaginatedResponse[*models.Series], error) {

	query := models.SeriesQuery(req.Ctx).
		With("UserSeries")

	if req.Order != nil {
		switch *req.Order {
		case SeriesOrderLastRead:
			uid, ok := auth.UserID(req.Ctx)
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
		query = query.WhereHas("UserSeries", func(q *builder.Builder) *builder.Builder {
			return q.Where("list", "=", list)
		})
	}

	if req.WithLatestBook {
		uid, ok := auth.UserID(req.Ctx)
		if ok {
			query = query.
				AddSelectSubquery(
					models.BookQuery(req.Ctx).
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
	}

	if req.UpdatedAfter != nil {
		query = query.OrWhereHas("UserSeries", func(q *builder.Builder) *builder.Builder {
			updatedAfter := database.TimeFrom(*req.UpdatedAfter)
			return q.Where("series.updated_at", ">=", updatedAfter)
		})
	}

	return paginatedList(&req.PaginatedRequest, query)
})

type SeriesUpdateRequest struct {
	Name      string            `path:"name"`
	AnilistID *nulls.Int        `json:"anilist_id"`
	UpdateMap map[string]string `json:"update_map"   validate:"require"`

	Ctx context.Context `inject:""`
}

var SeriesUpdate = request.Handler(func(r *SeriesUpdateRequest) (*models.Series, error) {
	s := &models.Series{}

	err := database.UpdateTx(r.Ctx, func(tx *sqlx.Tx) error {
		var err error
		s, err = models.SeriesQuery(r.Ctx).
			With("UserSeries").
			Find(tx, r.Name)
		if err != nil {
			return errors.Wrap(err, "failed to retrieve series from the database")
		}
		if s == nil {
			return Err404
		}

		if shouldUpdate(s.UpdateMap, r.UpdateMap, "anilist_id") {
			s.AnilistId = r.AnilistID
		}

		return model.SaveContext(r.Ctx, tx, s)
	})
	if err != nil {
		return nil, err
	}

	return s, nil
})
