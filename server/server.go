package server

import (
	"net/http"

	"github.com/abibby/comicbox-3/server/routes"
)

type Server struct {
	server http.Server
}

func New() *Server {
	return &Server{
		server: http.Server{
			Addr:    ":8080",
			Handler: routes.Router(),
		},
	}
}

func (s *Server) Run() error {
	return s.server.ListenAndServe()
}
func (s *Server) Close() {
	s.server.Close()
}
