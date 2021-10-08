package server

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/ui"
	"github.com/doug-martin/goqu/v9"
	"github.com/gorilla/mux"
)

func routes() http.Handler {
	r := mux.NewRouter()

	r.Use(loggingMiddleware)

	api := r.PathPrefix("/api/").Subrouter()

	api.HandleFunc("/series", SeriesIndex).Methods("GET")

	api.HandleFunc("/books", BookIndex).Methods("GET")
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
