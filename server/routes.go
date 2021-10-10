package server

import (
	"net/http"

	"github.com/abibby/comicbox-3/server/controllers"
	"github.com/abibby/comicbox-3/server/routes"
	"github.com/abibby/comicbox-3/ui"
	"github.com/gorilla/mux"
)

func init() {
	r := routes.Router()

	routes.Group("/api/", func(r *mux.Router) {

		// api := r.PathPrefix("/api/").Subrouter()

		r.HandleFunc("/series", controllers.SeriesIndex).Methods("GET").Name("series.index")

		r.HandleFunc("/books", controllers.BookIndex).Methods("GET").Name("book.index")
		r.HandleFunc("/books/{ID}/page/{Page}", controllers.BookPage).Methods("GET").Name("book.page")
		r.HandleFunc("/books/{ID}/page/{Page}", controllers.BookPage).Methods("GET").Name("book.thumbnail")

		r.NotFoundHandler = http.HandlerFunc(controllers.API404)
	})

	r.PathPrefix("/").
		Handler(FileServerDefault(ui.Content, "dist", "index.html")).
		Methods("GET")
}
