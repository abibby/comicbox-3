package controllers

import (
	"context"
	"fmt"

	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/server/metadata"
	"github.com/abibby/salusa/database"
	"github.com/abibby/salusa/database/builder"
	"github.com/abibby/salusa/database/model"
	"github.com/abibby/salusa/request"
	"github.com/jmoiron/sqlx"
)

type MetaUpdateRequest struct {
	SeriesSlug string `path:"slug"`

	Update database.Update `inject:""`
	Ctx    context.Context `inject:""`
}
type MetaUpdateResponse struct {
	Success bool `json:"success"`
}

var MetaUpdate = request.Handler(func(req *MetaUpdateRequest) (*models.Series, error) {
	return database.Value(req.Update, func(tx *sqlx.Tx) (*models.Series, error) {
		series, err := models.SeriesQuery(req.Ctx).Find(tx, req.SeriesSlug)
		if err != nil {
			return nil, fmt.Errorf("failed to retrieve series: %w", err)
		}

		if series == nil {
			return nil, request.ErrStatusNotFound
		}

		meta := metadata.MetaProviderFactory()
		err = metadata.Update(req.Ctx, tx, meta, series)
		if err != nil {
			return nil, fmt.Errorf("failed to update metadata: %w", err)
		}

		err = model.SaveContext(req.Ctx, tx, series)
		if err != nil {
			return nil, err
		}

		err = builder.LoadContext(req.Ctx, tx, series, "LatestBook")
		if err != nil {
			return nil, err
		}
		return series, nil
	})
})

type MetaListRequest struct {
	Title string `query:"title"`

	Ctx context.Context `inject:""`
}
type MetaListResponse struct {
	Data []metadata.SeriesMetadata `json:"data"`
}

var MetaList = request.Handler(func(req *MetaListRequest) (*MetaListResponse, error) {

	provider := metadata.MetaProviderFactory()
	meta, err := provider.SearchSeries(req.Ctx, req.Title)
	if err != nil {
		return nil, err
	}
	return &MetaListResponse{
		Data: meta,
	}, nil
})
