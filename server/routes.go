package server

import (
	"database/sql"
	"encoding/json"
	"log"
	"net/http"
	"time"

	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/ui"
	"github.com/doug-martin/goqu/v9"
	"github.com/google/uuid"
	"github.com/gorilla/mux"
	"github.com/jmoiron/sqlx"
)

func routes() http.Handler {
	r := mux.NewRouter()

	r.Use(loggingMiddleware)

	api := r.PathPrefix("/api/").Subrouter()

	api.HandleFunc("/series", SeriesIndex).Methods("GET")

	api.HandleFunc("/books", BookIndex).Methods("GET")
	api.HandleFunc("/books/create", BookCreate)
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
	books := []models.Book{}

	query := goqu.
		From("books").
		Select(&models.Book{})

	index(rw, r, query, &books)
}

func BookCreate(rw http.ResponseWriter, r *http.Request) {
	book := &models.Book{
		ID:        uuid.New(),
		CreatedAt: database.Time(time.Now()),
		UpdatedAt: database.Time(time.Now()),
		Title:     "A title",
		Series:    "New Series",
		Pages:     []models.Page{},
		Authors:   []string{},
	}

	err := book.PrepareForDatabase()
	if err != nil {
		sendJSON(rw, &ErrorResponse{Error: err.Error()})
		return
	}

	insertSQL, args, err := goqu.Insert("books").Rows(book).ToSQL()
	if err != nil {
		sendJSON(rw, &ErrorResponse{Error: err.Error()})
		return
	}

	err = database.UpdateTx(r.Context(), func(tx *sqlx.Tx) error {
		s := &models.Series{}
		err := tx.Get(s, "select * from series where name = ?", book.Series)
		if err == sql.ErrNoRows {
			err = createSeriesFromBook(tx, book)
		}
		if err != nil {
			return err
		}
		_, err = tx.Query(insertSQL, args...)
		return err
	})
	if err != nil {
		sendJSON(rw, &ErrorResponse{Error: err.Error()})
		return
	}

	sendJSON(rw, book)
}

func createSeriesFromBook(tx *sqlx.Tx, book *models.Book) error {
	insertSQL, args, err := goqu.Insert("series").Rows(&models.Series{
		Name:      book.Series,
		CreatedAt: database.Time(time.Now()),
		UpdatedAt: database.Time(time.Now()),
	}).ToSQL()
	if err != nil {
		return err
	}
	_, err = tx.Query(insertSQL, args...)
	return err
}

func SeriesIndex(rw http.ResponseWriter, r *http.Request) {
	series := []models.Series{}

	query := goqu.
		From("series").
		Select(&models.Series{})

	index(rw, r, query, &series)
}

func sendJSON(rw http.ResponseWriter, v interface{}) {
	rw.Header().Add("Content-Type", "application/json")
	err := json.NewEncoder(rw).Encode(v)
	if err != nil {
		log.Print(err)
	}
}
