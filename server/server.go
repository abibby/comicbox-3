package server

import (
	"net/http"

	"github.com/abibby/comicbox-3/server/router"
)

type Server struct {
	server http.Server
}

func New() *Server {
	return &Server{
		server: http.Server{
			Addr:    ":8080",
			Handler: router.Router(),
		},
	}
}

func (s *Server) Run() error {
	return s.server.ListenAndServe()
}
func (s *Server) Close() {
	s.server.Close()
}
