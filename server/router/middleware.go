package router

import (
	"fmt"
	"log"
	"net/http"
	"net/url"
	"runtime/debug"
)

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		u, _ := url.ParseRequestURI(r.RequestURI)

		q := u.Query()
		if q.Has("_token") {
			q.Del("_token")
			u.RawQuery = q.Encode()
		}
		log.Println(u.String())

		next.ServeHTTP(w, r)
	})
}

func errorMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if r := recover(); r != nil {
				w.WriteHeader(500)

				fmt.Fprintf(w, "%v\n\n%s", r, debug.Stack())
			}
		}()

		next.ServeHTTP(w, r)
	})
}
