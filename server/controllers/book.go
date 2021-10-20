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

func BookReading(rw http.ResponseWriter, r *http.Request) {
	uid, ok := userID(r)
	if !ok {
		sendJSON(rw, &PaginatedResponse{})
		return
	}

	seriesQuery := `select (
		select
			id
		from
			books
		left join user_books user_books on
			books.id = user_books.book_id
			and user_books.user_id = ?
		WHERE
			books.series = series.name
			and (user_books.current_page < (books.page_count - 1)
				or user_books.current_page is null)
		order by
			sort
		limit 1
	)
	from "series"
	join user_series
		on user_series.series_name = series.name
		and user_series.user_id = ?
	where user_series.list = 'reading'`

	// seriesQuery := goqu.From("series").Select(goqu.L(bookQuery, uid))

	query := goqu.
		From("books").
		Select(&models.Book{}).
		Where(goqu.C("id").In(goqu.L(seriesQuery, uid, uid)))

	index(rw, r, query, &models.BookList{})
}

type BookUpdateRequest struct {
	ID      string         `url:"id" validate:"required|uuid"`
	Title   string         `json:"page"`
	Series  string         `json:"series"`
	Volume  *nulls.Float64 `json:"volume"`
	Chapter *nulls.Float64 `json:"chapter"`
}

func BookUpdate(rw http.ResponseWriter, r *http.Request) {
	req := &BookUpdateRequest{}
	err := validate.Run(r, req)
	if err != nil {
		sendError(rw, err)
		return
	}

	book := &models.Book{}
	err = database.UpdateTx(r.Context(), func(tx *sqlx.Tx) error {
		err = tx.Get(book, "select * from books where id = ?", req.ID)
		if err != nil {
			return err
		}

		book.AfterLoad(r.Context(), tx)

		book.Title = req.Title
		book.Series = req.Series
		book.Volume = req.Volume
		book.Chapter = req.Chapter

		models.Save(r.Context(), book, tx)

		return nil
	})
	if err != nil {
		sendError(rw, err)
		return
	}
	sendJSON(rw, book)
}
