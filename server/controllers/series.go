package controllers

import (
	"net/http"

	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/server/validate"
	"github.com/abibby/nulls"
	"github.com/doug-martin/goqu/v9"
)

type SeriesIndexRequest struct {
	Name *nulls.String `query:"name"`
}

func SeriesIndex(rw http.ResponseWriter, r *http.Request) {
	req := &SeriesIndexRequest{}
	err := validate.Run(r, req)
	if err != nil {
		sendError(rw, err)
		return
	}

	query := goqu.
		From("series").
		Select(&models.Series{}).
		Order(goqu.I("name").Asc())

	if name, ok := req.Name.Ok(); ok {
		query = query.Where(goqu.Ex{"name": name})
	}

	index(rw, r, query, &models.SeriesList{})
}
