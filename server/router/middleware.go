package router

import (
	"fmt"
	"log"
	"net/http"
	"net/url"
	"runtime/debug"
	"time"
)

func loggingMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		next.ServeHTTP(w, r)
		u, _ := url.ParseRequestURI(r.RequestURI)

		q := u.Query()
		if q.Has("_token") {
			q.Del("_token")
			u.RawQuery = q.Encode()
		}
		log.Printf("%s, %v", u.String(), time.Since(start))
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
