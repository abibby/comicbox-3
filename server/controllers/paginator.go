package controllers

import (
	"context"
	"fmt"
	"time"

	"github.com/abibby/nulls"
	salusadb "github.com/abibby/salusa/database"
	"github.com/abibby/salusa/database/builder"
	"github.com/abibby/salusa/database/model"
	"github.com/abibby/salusa/database/model/mixins"
	"github.com/jmoiron/sqlx"
)

type PaginatedRequest struct {
	Page         *nulls.Int `query:"page"         validate:"min:1"`
	PageSize     *nulls.Int `query:"page_size"    validate:"min:1|max:100"`
	WithDeleted  bool       `query:"with_deleted" validate:"boolean"`
	UpdatedAfter *time.Time `query:"updated_after"`

	Ctx  context.Context `inject:""`
	Read salusadb.Read   `inject:""`
}

type PaginatedResponse[T any] struct {
	Page     int `json:"page"`
	PageSize int `json:"page_size"`
	Total    int `json:"total"`
	Data     []T `json:"data"`
}

func paginatedList[T model.Model](req *PaginatedRequest, query *builder.ModelBuilder[T]) (*PaginatedResponse[T], error) {
	pageSize := 100
	page := 0

	if p, ok := req.Page.Ok(); ok {
		page = p - 1
	}
	if ps, ok := req.PageSize.Ok(); ok {
		pageSize = ps
	}

	if req.WithDeleted {
		query = query.WithoutGlobalScope(mixins.SoftDeleteScope)
	}

	return salusadb.Value(req.Read, func(tx *sqlx.Tx) (*PaginatedResponse[T], error) {
		models, err := query.
			Limit(pageSize).
			Offset(page * pageSize).
			Get(tx)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch page: %w", err)
		}

		query.Dump()

		total, err := query.Count(tx)
		if err != nil {
			return nil, fmt.Errorf("failed to fetch total count: %w", err)
		}

		return &PaginatedResponse[T]{
			Page:     page + 1,
			PageSize: pageSize,
			Total:    total,
			Data:     models,
		}, nil
	})
}
