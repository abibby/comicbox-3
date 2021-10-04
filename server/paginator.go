package server

import (
	"net/http"

	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/models"
	"github.com/doug-martin/goqu/v9"
	"github.com/jmoiron/sqlx"
)

type PaginatedResponse struct {
	Page  int         `json:"page"`
	Total int         `json:"total"`
	Data  interface{} `json:"data"`
}
type ErrorResponse struct {
	Error string `json:"error"`
}

func index(rw http.ResponseWriter, r *http.Request, query *goqu.SelectDataset, v interface{}) {
	pageSize := uint(10)
	page := uint(0)

	dataSQL, dataArgs, err := query.
		Limit(pageSize).
		Offset(page * pageSize).
		ToSQL()
	if err != nil {
		sendJSON(rw, &ErrorResponse{Error: err.Error()})
		return
	}
	countSQL, countArgs, err := query.
		Select(goqu.COUNT('*')).
		ToSQL()
	if err != nil {
		sendJSON(rw, &ErrorResponse{Error: err.Error()})
		return
	}

	total := 0

	err = database.ReadTx(r.Context(), func(tx *sqlx.Tx) error {
		tx.Get(&total, countSQL, countArgs...)
		return tx.Select(v, dataSQL, dataArgs...)
	})
	if err != nil {
		sendJSON(rw, &ErrorResponse{Error: err.Error()})
		return
	}

	if v, ok := v.(models.PrepareForDisplayer); ok {
		err = v.PrepareForDisplay()
		if err != nil {
			sendJSON(rw, &ErrorResponse{Error: err.Error()})
			return
		}
	}

	pr := PaginatedResponse{
		Page:  int(page),
		Total: total,
		Data:  v,
	}
	sendJSON(rw, pr)
}
