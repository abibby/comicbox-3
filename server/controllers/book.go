package controllers

import (
	"archive/zip"
	"fmt"
	"io"
	"log"
	"net/http"

	"github.com/abibby/comicbox-3/app"
	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/server/validate"
	"github.com/abibby/nulls"
	"github.com/doug-martin/goqu/v9"
	"github.com/jmoiron/sqlx"
)

type BookIndexRequest struct {
	ID       *nulls.String `query:"id"        validate:"uuid"`
	Series   *nulls.String `query:"series"`
	BeforeID *nulls.String `query:"before_id" validate:"uuid"`
	AfterID  *nulls.String `query:"after_id"  validate:"uuid"`
	Order    *nulls.String `query:"order"     validate:"in:asc,desc"`
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
		Select(&models.Book{})

	if id, ok := req.ID.Ok(); ok {
		query = query.Where(goqu.Ex{"id": id})
	}
	if series, ok := req.Series.Ok(); ok {
		query = query.Where(goqu.Ex{"series": series})
	}

	if order, _ := req.Order.Ok(); order == "desc" {
		query = query.Order(goqu.I("sort").Desc())
	} else {
		query = query.Order(goqu.I("sort").Asc())
	}

	if afterID, ok := req.AfterID.Ok(); ok {
		query = query.Where(
			goqu.C("sort").Gt(
				goqu.From("books").
					Select("sort").
					Where(goqu.C("id").Eq(afterID)),
			),
		)
	}
	if beforeID, ok := req.BeforeID.Ok(); ok {
		query = query.Where(
			goqu.C("sort").Lt(
				goqu.From("books").
					Select("sort").
					Where(goqu.C("id").Eq(beforeID)),
			),
		)
	}

	index(rw, r, query, &models.BookList{})
}

// type BookAroundRequest struct {
// 	ID string `url:"id"`
// }
// type BookAroundResponse struct {
// 	Previous *models.Book `json:"previous"`
// 	Next     *models.Book `json:"next"`
// }

// func BookAround(rw http.ResponseWriter, r *http.Request) {
// 	req := &BookAroundRequest{}
// 	err := validate.Run(r, req)
// 	if err != nil {
// 		sendError(rw, err)
// 		return
// 	}
// 	response := &BookAroundResponse{}

// 	err = database.ReadTx(r.Context(), func(tx *sqlx.Tx) error {
// 		b := &models.Book{}
// 		err := tx.Get(b, "select * from books where id = ?", b.Series, b.Sort)

// 		err = tx.Get(&response.Previous, "select id from books where series=? and sort<? order by sort limit 1", b.Series, b.Sort)
// 		if err == sql.ErrNoRows {
// 		} else if err != nil {
// 			return err
// 		}

// 		err = tx.Get(&response.Next, "select id from books where series=? and sort>? order by sort desc limit 1", b.Series, b.Sort)
// 		if err == sql.ErrNoRows {
// 		} else if err != nil {
// 			return err
// 		}
// 		return nil
// 	})
// 	if err != nil {
// 		sendError(rw, err)
// 		return
// 	}
// 	sendJSON(rw, response)
// }

type BookPageRequest struct {
	ID   string `url:"id"   validate:"uuid"`
	Page int    `url:"page" validate:"min:0"`
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

	if req.Page < 0 || req.Page >= len(imgs) {
		sendError(rw, NewHttpError(404, fmt.Errorf("not found")))
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
		log.Print(err)
	}
}
