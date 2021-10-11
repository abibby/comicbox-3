package controllers

import (
	"archive/zip"
	"io"
	"net/http"
	"time"

	"github.com/abibby/comicbox-3/app"
	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/server/validate"
	"github.com/abibby/nulls"
	"github.com/doug-martin/goqu/v9"
	"github.com/jmoiron/sqlx"
)

type BookIndexRequest struct {
	ID           *nulls.String `query:"id"          validate:"uuid"`
	UpdatedAfter *time.Time    `query:"updated_after"`
}

func BookIndex(rw http.ResponseWriter, r *http.Request) {
	req := &BookIndexRequest{}
	err := validate.Run(r, req)
	if err != nil {
		sendError(rw, err)
		return
	}

	query := goqu.
		From("books").
		Select(&models.Book{}).
		Order(goqu.I("sort").Asc())

	if id, ok := req.ID.Ok(); ok {
		query = query.Where(goqu.Ex{"id": id})
	}
	if req.UpdatedAfter != nil {
		query = query.Where(goqu.C("updated_at").Gte(req.UpdatedAfter))
	}
	index(rw, r, query, &models.BookList{})
}

type BookPageRequest struct {
	ID   string `url:"id"   validate:"uuid"`
	Page int    `url:"page" validate:"min:0|max:9"`
}

func BookPage(rw http.ResponseWriter, r *http.Request) {
	req := &BookPageRequest{}
	err := validate.Run(r, req)
	if err != nil {
		sendError(rw, err)
		return
	}

	book := &models.Book{}
	err = database.ReadTx(r.Context(), func(tx *sqlx.Tx) error {
		return tx.Get(book, "select * from books where id = ?", req.ID)
	})
	if err != nil {
		sendError(rw, err)
		return
	}

	reader, err := zip.OpenReader(book.File)
	if err != nil {
		sendError(rw, err)
		return
	}

	imgs, err := app.ZippedImages(reader)
	if err != nil {
		sendError(rw, err)
		return
	}

	f, err := imgs[req.Page].Open()
	if err != nil {
		sendError(rw, err)
		return
	}

	rw.Header().Add("Cache-Control", "max-age=3600")

	_, err = io.Copy(rw, f)
	if err != nil {
		print(err)
	}
}
