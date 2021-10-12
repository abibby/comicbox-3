package server

import (
	"net/http"

	"github.com/abibby/comicbox-3/server/controllers"
	"github.com/abibby/comicbox-3/server/router"
	"github.com/abibby/comicbox-3/ui"
	"github.com/gorilla/mux"
)

func init() {
	r := router.Router()

	router.Group("/api/", func(r *mux.Router) {

		auth := r.NewRoute().Subrouter()
		auth.Use(controllers.AuthMiddleware(false))
		auth.HandleFunc("/series", controllers.SeriesIndex).Methods("GET").Name("series.index")

		auth.HandleFunc("/books", controllers.BookIndex).Methods("GET").Name("book.index")

		pages := r.NewRoute().Subrouter()
		pages.Use(controllers.AuthMiddleware(true))
		pages.HandleFunc("/books/{id}/page/{page}", controllers.BookPage).Methods("GET").Name("book.page")
		pages.HandleFunc("/books/{id}/page/{page}", controllers.BookPage).Methods("GET").Name("book.thumbnail")

		r.HandleFunc("/users", controllers.UserCreate).Methods("POST").Name("user.create")

		r.HandleFunc("/login", controllers.Login).Methods("POST").Name("login")

		r.NotFoundHandler = http.HandlerFunc(controllers.API404)
	})

	r.PathPrefix("/").
		Handler(FileServerDefault(ui.Content, "dist", "index.html")).
		Methods("GET")
}
