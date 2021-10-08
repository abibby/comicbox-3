package server

import (
	"archive/zip"
	"encoding/json"
	"io"
	"log"
	"net/http"

	"github.com/abibby/comicbox-3/app"
	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/ui"
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
		rw.Header().Add("Content-Type", "application/json")
		rw.WriteHeader(404)
		err := json.NewEncoder(rw).Encode(ErrorResponse{Error: "404 not found"})
		if err != nil {
			log.Print(err)
		}
	})

	r.PathPrefix("/").
		Handler(FileServerDefault(ui.Content, "dist", "index.html")).
		Methods("GET")

	return r
}

func BookIndex(rw http.ResponseWriter, r *http.Request) {
	query := goqu.
		From("books").
		Select(&models.Book{}).
		Order(goqu.I("sort").Asc())

	index(rw, r, query, &models.BookList{})
}

type BookPageRequest struct {
	ID   string `validate:"uuid"`
	Page int    `validate:"min:0|max:9"`
}

func BookPage(rw http.ResponseWriter, r *http.Request) {
	req := &BookPageRequest{}
	Validate(r, req)

	book := &models.Book{}
	err := database.ReadTx(r.Context(), func(tx *sqlx.Tx) error {
		return tx.Get(book, "select * from books where id = ?", req.ID)
	})
	if err != nil {
		sendJSON(rw, &ErrorResponse{Error: err.Error()})
		return
	}

	reader, err := zip.OpenReader(book.File)
	if err != nil {
		sendJSON(rw, &ErrorResponse{Error: err.Error()})
		return
	}

	imgs, err := app.ZippedImages(reader)
	if err != nil {
		sendJSON(rw, &ErrorResponse{Error: err.Error()})
		return
	}

	f, err := imgs[req.Page].Open()
	if err != nil {
		sendJSON(rw, &ErrorResponse{Error: err.Error()})
		return
	}
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
