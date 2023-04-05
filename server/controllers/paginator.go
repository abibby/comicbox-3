package controllers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/abibby/bob"
	bobmodels "github.com/abibby/bob/models"
	"github.com/abibby/bob/selects"
	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/server/validate"
	"github.com/abibby/nulls"
	"github.com/jmoiron/sqlx"
)

type PaginatedRequest struct {
	Page         *nulls.Int `query:"page"         validate:"min:1"`
	PageSize     *nulls.Int `query:"page_size"    validate:"min:1|max:100"`
	WithDeleted  bool       `query:"with_deleted" validate:"boolean"`
	UpdatedAfter *time.Time `query:"updated_after"`
}

type PaginatedResponse struct {
	Page     int         `json:"page"`
	PageSize int         `json:"page_size"`
	Total    int         `json:"total"`
	Data     interface{} `json:"data"`
}

func index[T bobmodels.Model](rw http.ResponseWriter, r *http.Request, query *selects.Builder[T], updatedAfter func(wl *selects.WhereList, updatedAfter *time.Time)) {
	req := &PaginatedRequest{}
	err := validate.Run(r, req)
	if err != nil {
		sendError(rw, err)
		return
	}
	pageSize := 10
	page := 0

	if p, ok := req.Page.Ok(); ok {
		page = p - 1
	}
	if ps, ok := req.PageSize.Ok(); ok {
		pageSize = ps
	}
	if req.UpdatedAfter != nil {
		query = query.And(func(wl *selects.WhereList) {
			wl.OrWhere("updated_at", ">=", req.UpdatedAfter)
			updatedAfter(wl, req.UpdatedAfter)
		})
	}

	if req.WithDeleted {
		query = query.WithoutGlobalScope(bob.SoftDeletes)
	}

	var total int
	var v []T
	err = database.ReadTx(r.Context(), func(tx *sqlx.Tx) error {
		var err error
		v, err = query.
			WithContext(r.Context()).
			Limit(pageSize).
			Offset(page * pageSize).Dump().
			Get(tx)
		if err != nil {
			return fmt.Errorf("failed to fetch page: %w", err)
		}
		err = query.
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

	sendJSON(rw, &PaginatedResponse{
		Page:     page + 1,
		PageSize: pageSize,
		Total:    total,
		Data:     v,
	})
}
