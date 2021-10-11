package controllers

import (
	"net/http"

	"github.com/abibby/comicbox-3/models"
	"github.com/doug-martin/goqu/v9"
)

func SeriesIndex(rw http.ResponseWriter, r *http.Request) {
	query := goqu.
		From("series").
		Select(&models.Series{}).
		Order(goqu.I("name").Asc())

	index(rw, r, query, &models.SeriesList{})
}
