package server

import (
	"archive/zip"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"

	"github.com/abibby/comicbox-3/app"
	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/server/validate"
	"github.com/abibby/comicbox-3/ui"
	"github.com/abibby/nulls"
	"github.com/doug-martin/goqu/v9"
	"github.com/gorilla/mux"
	"github.com/jmoiron/sqlx"
)

func routes() http.Handler {
	r := mux.NewRouter()

	r.Use(loggingMiddleware)

	api := r.PathPrefix("/api/").Subrouter()

	api.HandleFunc("/series", SeriesIndex).Methods("GET")

	api.HandleFunc("/books", BookIndex).Methods("GET")
	api.HandleFunc("/books/{ID}/page/{Page}", BookPage).Methods("GET")
	api.NotFoundHandler = http.HandlerFunc(func(rw http.ResponseWriter, r *http.Request) {
		sendError(rw, NewHttpError(404, fmt.Errorf("404 not found")))
	})

	r.PathPrefix("/").
		Handler(FileServerDefault(ui.Content, "dist", "index.html")).
		Methods("GET")

	return r
}

type BookIndexRequest struct {
	ID       *nulls.String `json:"id"        validate:"uuid"`
	Page     *nulls.Int    `json:"page"      validate:"min:1"`
	PageSize *nulls.Int    `json:"page_size" validate:"min:1|max:100"`
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
	index(rw, r, query, &models.BookList{})
}

type BookPageRequest struct {
	ID   string `validate:"uuid"`
	Page int    `validate:"min:0|max:9"`
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

func SeriesIndex(rw http.ResponseWriter, r *http.Request) {
	query := goqu.
		From("series").
		Select(&models.Series{}).
		Order(goqu.I("name").Asc())

	index(rw, r, query, &[]models.Series{})
}

func sendJSON(rw http.ResponseWriter, v interface{}) {
	rw.Header().Add("Content-Type", "application/json")
	err := json.NewEncoder(rw).Encode(v)
	if err != nil {
		log.Print(err)
	}
}
