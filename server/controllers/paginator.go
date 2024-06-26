package controllers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/server/validate"
	"github.com/abibby/nulls"
	"github.com/abibby/salusa/database/builder"
	"github.com/abibby/salusa/database/model"
	"github.com/jmoiron/sqlx"
)

type PaginatedRequest struct {
	Page         *nulls.Int `query:"page"         validate:"min:1"`
	PageSize     *nulls.Int `query:"page_size"    validate:"min:1|max:100"`
	WithDeleted  bool       `query:"with_deleted" validate:"boolean"`
	UpdatedAfter *time.Time `query:"updated_after"`
}

type PaginatedResponse[T any] struct {
	Page     int `json:"page"`
	PageSize int `json:"page_size"`
	Total    int `json:"total"`
	Data     []T `json:"data"`
}

func index[T model.Model](rw http.ResponseWriter, r *http.Request, query *builder.ModelBuilder[T], updatedAfter func(wl *builder.Conditions, updatedAfter *database.Time)) {
	req := &PaginatedRequest{}
	err := validate.Run(r, req)
	if err != nil {
		sendError(rw, err)
		return
	}
	pageSize := 100
	page := 0

	if p, ok := req.Page.Ok(); ok {
		page = p - 1
	}
	if ps, ok := req.PageSize.Ok(); ok {
		pageSize = ps
	}
	if req.UpdatedAfter != nil {
		query = query.And(func(wl *builder.Conditions) {
			t := (*database.Time)(req.UpdatedAfter)
			// var m T
			// wl.OrWhere(builder.GetTable(m)+".updated_at", ">=", t)
			updatedAfter(wl, t)
		})
	}

	if req.WithDeleted {
		query = query.WithoutGlobalScope(builder.SoftDeletes)
	}

	var total int
	var v []T
	err = database.ReadTx(r.Context(), func(tx *sqlx.Tx) error {
		var err error
		v, err = query.
			Limit(pageSize).
			Offset(page * pageSize).
			Get(tx)
		if err != nil {
			return fmt.Errorf("failed to fetch page: %w", err)
		}
		err = query.
			Unordered().
			SelectFunction("count", "*").
			LoadOne(tx, &total)
		if err != nil {
			return fmt.Errorf("failed to fetch total count: %w", err)
		}
		return nil
	})
	if err != nil {
		sendError(rw, err)
		return
	}

	sendJSON(rw, &PaginatedResponse[T]{
		Page:     page + 1,
		PageSize: pageSize,
		Total:    total,
		Data:     v,
	})
}
