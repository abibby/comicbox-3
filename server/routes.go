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

	router.Group(r, "/api/", func(r *mux.Router) {
		router.Group(r, "", func(r *mux.Router) {
			r.Use(controllers.AuthMiddleware(false, controllers.TokenAuthenticated))
			r.HandleFunc("/series", controllers.SeriesIndex).Methods("GET").Name("series.index")
			r.HandleFunc("/series/{name}", controllers.SeriesUpdate).Methods("POST").Name("series.update")
			r.HandleFunc("/series/{name}/user-series", controllers.UserSeriesUpdate).Methods("POST").Name("user-series.update")

			r.HandleFunc("/books", controllers.BookIndex).Methods("GET").Name("book.index")
			r.HandleFunc("/books/{id}", controllers.BookUpdate).Methods("POST").Name("book.update")
			r.HandleFunc("/books/{id}", controllers.BookDelete).Methods("DELETE").Name("book.delete")
			r.HandleFunc("/books/{id}/user-book", controllers.UserBookUpdate).Methods("POST").Name("user-book.update")

			r.HandleFunc("/sync", controllers.Sync).Methods("POST").Name("sync")

			r.HandleFunc("/anilist/update", controllers.AnilistUpdate).Methods("POST").Name("anilist.update")
			r.HandleFunc("/anilist/login", controllers.AnilistLogin).Methods("POST").Name("anilist.login")

			r.HandleFunc("/users/create-token", controllers.UserCreateToken).Methods("GET").Name("user-create-token")
		})

		router.Group(r, "", func(r *mux.Router) {
			r.Use(controllers.AuthMiddleware(true, controllers.TokenImage))
			r.HandleFunc("/books/{id}/page/{page}", controllers.BookPage).Methods("GET").Name("book.page")
			{
				r := r.NewRoute().Subrouter()
				r.Use(router.CacheMiddleware)
				r.HandleFunc("/books/{id}/page/{page}/thumbnail", controllers.BookThumbnail).Methods("GET").Name("book.thumbnail")
			}
		})

		r.HandleFunc("/users", controllers.UserCreate).Methods("POST").Name("user.create")

		r.HandleFunc("/login", controllers.Login).Methods("POST").Name("login")

		router.Group(r, "", func(r *mux.Router) {
			r.Use(controllers.AuthMiddleware(false, controllers.TokenRefresh))
			r.HandleFunc("/login/refresh", controllers.Refresh).Methods("POST").Name("refresh")
		})

		r.NotFoundHandler = http.HandlerFunc(controllers.API404)
	})

	r.HandleFunc("/static-files", controllers.StaticFiles).Methods("GET")

	r.PathPrefix("/").
		Handler(FileServerDefault(ui.Content, "dist", "index.html")).
		Methods("GET")
}
