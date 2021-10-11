package router

import (
	"github.com/gorilla/mux"
)

var r *mux.Router

func init() {
	r = mux.NewRouter()

	r.Use(loggingMiddleware)

}

func Group(prefix string, handler func(*mux.Router)) {
	sub := r.PathPrefix(prefix).Subrouter()

	handler(sub)
}

func Router() *mux.Router {
	return r
}

func URL(name string, pairs ...string) (string, error) {
	u, err := r.Get(name).URL(pairs...)
	if err != nil {
		return "", err
	}
	return u.String(), nil
}

func MustURL(name string, pairs ...string) string {
	u, err := r.Get(name).URL(pairs...)
	if err != nil {
		panic(err)
	}
	return u.String()
}
