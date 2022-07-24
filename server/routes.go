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
		auth.Use(controllers.AuthMiddleware(false, controllers.TokenAuthenticated))
		auth.HandleFunc("/series", controllers.SeriesIndex).Methods("GET").Name("series.index")
		auth.HandleFunc("/series/{name}", controllers.SeriesUpdate).Methods("POST").Name("series.update")
		auth.HandleFunc("/series/{name}/user-series", controllers.UserSeriesUpdate).Methods("POST").Name("user-series.update")

		auth.HandleFunc("/books", controllers.BookIndex).Methods("GET").Name("book.index")
		auth.HandleFunc("/books/{id}", controllers.BookUpdate).Methods("POST").Name("book.update")
		auth.HandleFunc("/books/reading", controllers.BookReading).Methods("GET").Name("book.reading")
		auth.HandleFunc("/books/{id}/user-book", controllers.UserBookUpdate).Methods("POST").Name("user-book.update")

		auth.HandleFunc("/anilist/update", controllers.AnilistUpdate).Methods("POST").Name("anilist.update")
		auth.HandleFunc("/anilist/login", controllers.AnilistLogin).Methods("POST").Name("anilist.login")

		auth.HandleFunc("/users/create-token", controllers.UserCreateToken).Methods("GET").Name("user-create-token")

		pages := r.NewRoute().Subrouter()
		pages.Use(controllers.AuthMiddleware(true, controllers.TokenImage))
		pages.HandleFunc("/books/{id}/page/{page}", controllers.BookPage).Methods("GET").Name("book.page")

		thumb := pages.NewRoute().Subrouter()
		thumb.Use(router.CacheMiddleware)
		thumb.HandleFunc("/books/{id}/page/{page}/thumbnail", controllers.BookThumbnail).Methods("GET").Name("book.thumbnail")

		r.HandleFunc("/users", controllers.UserCreate).Methods("POST").Name("user.create")

		r.HandleFunc("/login", controllers.Login).Methods("POST").Name("login")

		refresh := r.NewRoute().Subrouter()
		refresh.Use(controllers.AuthMiddleware(false, controllers.TokenRefresh))
		refresh.HandleFunc("/login/refresh", controllers.Refresh).Methods("POST").Name("refresh")

		r.NotFoundHandler = http.HandlerFunc(controllers.API404)
	})

	r.PathPrefix("/").
		Handler(FileServerDefault(ui.Content, "dist", "index.html")).
		Methods("GET")
}
