package controllers

import (
	"context"
	"os"

	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/server/auth"
	"github.com/abibby/nulls"
	salusadb "github.com/abibby/salusa/database"
	"github.com/abibby/salusa/database/builder"
	"github.com/abibby/salusa/database/model"
	"github.com/abibby/salusa/request"
	"github.com/jmoiron/sqlx"
	"github.com/pkg/errors"
)

type SeriesOrder string

func (l SeriesOrder) Options() map[string]string {
	return map[string]string{
		"Name":      string(SeriesOrderName),
		"LastRead":  string(SeriesOrderLastRead),
		"CreatedAt": string(SeriesOrderCreatedAt),
	}
}

const (
	SeriesOrderName      = SeriesOrder("name")
	SeriesOrderLastRead  = SeriesOrder("last-read")
	SeriesOrderCreatedAt = SeriesOrder("created_at")
)

type SeriesIndexRequest struct {
	PaginatedRequest

	Slug    *nulls.String `query:"slug"`
	List    models.List   `query:"list"`
	OrderBy *SeriesOrder  `query:"order_by"`
	Order   *nulls.String `query:"order" validate:"in:asc,desc"`

	Ctx context.Context `inject:""`
}

var SeriesIndex = request.Handler(func(req *SeriesIndexRequest) (*PaginatedResponse[*models.Series], error) {

	query := models.SeriesQuery(req.Ctx).
		With("UserSeries.LatestBook.UserBook")

	orderColumn := "name"
	if req.OrderBy != nil {
		switch *req.OrderBy {
		case SeriesOrderLastRead:
			uid, ok := auth.UserID(req.Ctx)
			if ok {
				query = query.JoinOn("user_series", func(q *builder.Conditions) {
					q.WhereColumn("series.name", "=", "user_series.series_name").
						Where("user_series.user_id", "=", uid)
				}).OrderByDesc("user_series.last_read_at")
			}
			orderColumn = "name"
		case SeriesOrderCreatedAt:
			orderColumn = "created_at"
		}
	}

	if req.Order.Value() == "desc" {
		query = query.OrderByDesc(orderColumn)
	} else {
		query = query.OrderBy(orderColumn)
	}

	if orderColumn != "name" {
		query = query.OrderBy("name")
	}

	if name, ok := req.Slug.Ok(); ok {
		query = query.Where("name", "=", name)
	}
	if req.List != "" {
		query = query.WhereHas("UserSeries", func(q *builder.Builder) *builder.Builder {
			return q.Where("list", "=", req.List)
		})
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
	Slug         string             `path:"slug"`
	Name         string             `json:"name" validate:"require"`
	Aliases      []string           `json:"aliases"`
	Genres       []string           `json:"genres"`
	Tags         []string           `json:"tags"`
	Description  string             `json:"description"`
	Year         *nulls.Int         `json:"year"`
	MetadataID   *models.MetadataID `json:"metadata_id"`
	LockedFields []string           `json:"locked_fields"`
	UpdateMap    map[string]string  `json:"update_map" validate:"require"`

	Ctx context.Context `inject:""`
}

var SeriesUpdate = request.Handler(func(r *SeriesUpdateRequest) (*models.Series, error) {
	s := &models.Series{}

	err := database.UpdateTx(r.Ctx, func(tx *sqlx.Tx) error {
		var err error
		s, err = models.SeriesQuery(r.Ctx).
			With("UserSeries").
			Find(tx, r.Slug)
		if err != nil {
			return errors.Wrap(err, "failed to retrieve series from the database")
		}
		if s == nil {
			return Err404
		}

		if shouldUpdate(s.UpdateMap, r.UpdateMap, "metadata_id") {
			s.MetadataID = r.MetadataID
		}

		if shouldUpdate(s.UpdateMap, r.UpdateMap, "name") {
			s.Name = r.Name
		}

		if shouldUpdate(s.UpdateMap, r.UpdateMap, "aliases") {
			s.Aliases = r.Aliases
		}

		if shouldUpdate(s.UpdateMap, r.UpdateMap, "genres") {
			s.Genres = r.Genres
		}

		if shouldUpdate(s.UpdateMap, r.UpdateMap, "tags") {
			s.Tags = r.Tags
		}

		if shouldUpdate(s.UpdateMap, r.UpdateMap, "description") {
			s.Description = r.Description
		}

		if shouldUpdate(s.UpdateMap, r.UpdateMap, "year") {
			s.Year = r.Year
		}

		if shouldUpdate(s.UpdateMap, r.UpdateMap, "locked_fields") {
			s.LockedFields = r.LockedFields
		}

		return model.SaveContext(r.Ctx, tx, s)
	})
	if err != nil {
		return nil, err
	}

	return s, nil
})

type SeriesThumbnailRequest struct {
	Slug string        `path:"slug"`
	Read salusadb.Read `inject:""`

	Ctx context.Context `inject:""`
}

var SeriesThumbnail = request.Handler(func(r *SeriesThumbnailRequest) (any, error) {
	series, err := salusadb.Value(r.Read, func(tx *sqlx.Tx) (*models.Series, error) {
		return models.SeriesQuery(r.Ctx).Find(tx, r.Slug)
	})
	if err != nil {
		return nil, err
	}
	f, err := os.Open(series.CoverImagePath())
	if err != nil {
		return nil, err
	}
	return request.NewResponse(f), nil
})
