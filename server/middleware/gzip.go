package middleware

import (
	"compress/gzip"
	"net/http"

	"github.com/abibby/salusa/router"
)

func Gzip() router.Middleware {
	return router.InlineMiddlewareFunc(func(w http.ResponseWriter, r *http.Request, next http.Handler) {
		gz := gzip.NewWriter(w)
		w.Header().Set("Content-Encoding", "gzip")
		next.ServeHTTP(&GzipResponseWriter{
			w:  w,
			gz: gz,
		}, r)
		gz.Close()
	})
}
