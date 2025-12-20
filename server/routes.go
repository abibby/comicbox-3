package server

import (
	"context"
	"log/slog"
	"math/rand"
	"net/http"
	"time"

	"github.com/abibby/comicbox-3/server/auth"
	"github.com/abibby/comicbox-3/server/controllers"
	"github.com/abibby/comicbox-3/server/middleware"
	"github.com/abibby/comicbox-3/ui"
	"github.com/abibby/salusa/clog"
	"github.com/abibby/salusa/openapidoc"
	"github.com/abibby/salusa/request"
	"github.com/abibby/salusa/router"
	"github.com/gorilla/mux"
)

const randOpts = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
const randOptsLen = len(randOpts)

func randStr(l int) string {
	b := make([]byte, l)
	for i := range l {
		b[i] = byte(randOpts[rand.Intn(randOptsLen)])
	}
	return string(b)
}

type responseRecorder struct {
	http.ResponseWriter
	StatusCode int
}

func newResponseRecorder(w http.ResponseWriter) *responseRecorder {
	return &responseRecorder{
		ResponseWriter: w,
		StatusCode:     200,
	}
}

func (r *responseRecorder) WriteHeader(statusCode int) {
	r.StatusCode = statusCode
	r.ResponseWriter.WriteHeader(statusCode)
}

func InitRouter(r *router.Router) {
	r.Use(controllers.AttachUserMiddleware())
	r.Use(router.InlineMiddlewareFunc(func(w http.ResponseWriter, r *http.Request, next http.Handler) {
		id := randStr(5)
		ctx := clog.With(r.Context(), slog.String("id", id))
		w.Header().Add("X-Request-Id", id)

		c, ok := auth.GetClaims(r.Context())
		if ok {
			ctx = clog.With(ctx, slog.Any("user_id", c.Subject))
		}

		next.ServeHTTP(w, r.WithContext(ctx))
	}))
	r.Use(router.InlineMiddlewareFunc(func(w http.ResponseWriter, r *http.Request, next http.Handler) {
		rr := newResponseRecorder(w)
		start := time.Now()
		defer func() {
			u := *r.URL
			q := u.Query()
			q.Del("_token")
			u.RawQuery = q.Encode()

			clog.Use(r.Context()).Info("request",
				"url", u.String(),
				"status", rr.StatusCode,
				"user_agent", r.Header.Get("User-Agent"),
				"duration", time.Since(start).Truncate(time.Millisecond),
				"route_name", mux.CurrentRoute(r).GetName(),
			)
		}()
		next.ServeHTTP(rr, r)
	}))

	r.Use(request.HandleErrors(func(ctx context.Context, err error) http.Handler {
		clog.Use(ctx).Warn("request failed", "err", err)
		return nil
	}))

	r.Group("/api", func(r *router.Router) {
		r.Get("/series", controllers.SeriesIndex).Name("series.index").Middleware(controllers.HasScope(auth.ScopeBookIndex))
		r.Post("/series/{slug}", controllers.SeriesUpdate).Name("series.update").Middleware(controllers.HasScope(auth.ScopeSeriesWrite))
		r.Post("/series/{slug}/user-series", controllers.UserSeriesUpdate).Name("user-series.update").Middleware(controllers.HasScope(auth.ScopeUserSeriesWrite))

		r.Get("/books", controllers.BookIndex).Name("book.index").Middleware(controllers.HasScope(auth.ScopeBookIndex))
		r.Post("/books/{id}", controllers.BookUpdate).Name("book.update").Middleware(controllers.HasScope(auth.ScopeBookWrite))
		r.Delete("/books/{id}", controllers.BookDelete).Name("book.delete").Middleware(controllers.HasScope(auth.ScopeBookDelete))
		r.Post("/books/{id}/user-book", controllers.UserBookUpdate).Name("user-book.update").Middleware(controllers.HasScope(auth.ScopeUserBookWrite))

		r.Post("/sync", controllers.Sync).Name("sync").Middleware(controllers.HasScope(auth.ScopeBookSync))

		r.Get("/users/create-token", controllers.UserCreateToken).Name("user-create-token").Middleware(controllers.HasScope(auth.ScopeUserWrite))
		r.Get("/users/current", controllers.UserCurrent).Name("user.current").Middleware(controllers.HasScope(auth.ScopeUserRead))

		r.Group("/meta", func(r *router.Router) {
			r.Use(controllers.HasScope(auth.ScopeSeriesWrite))

			r.Get("", controllers.MetaList).Name("meta.list")
			r.Post("/sync", controllers.MetaStartScan).Name("meta.scan")
			r.Post("/update/{slug}", controllers.MetaUpdate).Name("meta.update")
		})

		r.Group("/files", func(r *router.Router) {
			r.Post("", controllers.FileCreate).Middleware(controllers.HasScope(auth.ScopeUserRead))
			r.Get("/{id}", controllers.FileView).Middleware(controllers.HasScope(auth.ScopeUserRead))
			r.Delete("/{id}", controllers.FileDelete).Middleware(controllers.HasScope(auth.ScopeUserRead))
		})

		r.Group("", func(r *router.Router) {
			r.Use(controllers.HasScope(auth.ScopeAdmin))

			r.Get("/users", controllers.UserList).Name("user.list")
			r.Put("/users/{id}", controllers.UserUpdate).Name("user.update")

			r.Get("/roles", controllers.RoleList).Name("role.list")
		})

		r.Group("", func(r *router.Router) {
			r.Use(controllers.HasScope(auth.ScopeImage))

			r.Get("/series/{slug}/thumbnail", controllers.SeriesThumbnail).Name("series.thumbnail")
			r.Get("/books/{id}/page/{page}", controllers.BookPage).Name("book.page")
			r.Group("", func(r *router.Router) {
				r.Use(middleware.CacheMiddleware())
				r.Get("/books/{id}/page/{page}/thumbnail", controllers.BookThumbnail).Name("book.thumbnail")
			})
		})
		r.PostFunc("/users", controllers.UserCreate).Name("user.create")
		r.Post("/users/password", controllers.ChangePassword).Name("user.change.password")

		r.PostFunc("/login", controllers.Login).Name("login")

		r.Post("/rum", controllers.RumLogging).Name("rum.logging")

		r.PostFunc("/login/refresh", controllers.Refresh).Name("refresh").Middleware(controllers.HasScope(auth.ScopeRefresh))

		r.Handle("/docs", openapidoc.SwaggerUI())

		r.Handle("/", http.HandlerFunc(controllers.API404)).Name("404")
	})

	r.GetFunc("/static-files", controllers.StaticFiles)

	r.Handle("/", FileServerDefault(ui.Content, "dist", "index.html")).Name("static.files")
}
