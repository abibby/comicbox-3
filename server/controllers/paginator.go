package controllers

import (
	"fmt"
	"net/http"
	"time"

	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/server/validate"
	"github.com/abibby/nulls"
	"github.com/doug-martin/goqu/v9"
	"github.com/jmoiron/sqlx"
)

type PaginatedRequest struct {
	Page         *nulls.Int `query:"page"      validate:"min:1"`
	PageSize     *nulls.Int `query:"page_size" validate:"min:1|max:100"`
	UpdatedAfter *time.Time `query:"updated_after"`
}

type PaginatedResponse struct {
	Page     int         `json:"page"`
	PageSize int         `json:"page_size"`
	Total    int         `json:"total"`
	Data     interface{} `json:"data"`
}

func index(rw http.ResponseWriter, r *http.Request, query *goqu.SelectDataset, v interface{}) {
	req := &PaginatedRequest{}
	err := validate.Run(r, req)
	if err != nil {
		sendError(rw, err)
		return
	}
	pageSize := uint(10)
	page := uint(0)

	if p, ok := req.Page.Ok(); ok {
		page = uint(p - 1)
	}
	if ps, ok := req.PageSize.Ok(); ok {
		pageSize = uint(ps)
	}
	if req.UpdatedAfter != nil {
		query = query.Where(goqu.C("updated_at").Gte(req.UpdatedAfter))
	}

	dataSQL, dataArgs, err := query.
		Limit(pageSize).
		Offset(page * pageSize).
		ToSQL()
	if err != nil {
		sendError(rw, err)
		return
	}
	countSQL, countArgs, err := query.
		Select(goqu.COUNT('*')).
		ToSQL()
	if err != nil {
		sendError(rw, err)
		return
	}

	total := 0

	err = database.ReadTx(r.Context(), func(tx *sqlx.Tx) error {
		err := tx.Get(&total, countSQL, countArgs...)
		if err != nil {
			return err
		}

		fmt.Println(dataSQL)
		err = tx.Select(v, dataSQL, dataArgs...)
		if err != nil {
			return err
		}

		if v, ok := v.(models.AfterLoader); ok {
			err = v.AfterLoad(r.Context(), tx)
			if err != nil {
				return err
			}
		}
		return nil
	})
	if err != nil {
		sendError(rw, err)
		return
	}

	sendJSON(rw, &PaginatedResponse{
		Page:     int(page + 1),
		PageSize: int(pageSize),
		Total:    total,
		Data:     v,
	})
}
