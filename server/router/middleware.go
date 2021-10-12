package router

import (
	"log"
	"net/http"
	"net/url"
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
