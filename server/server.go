package server

import (
	"net/http"
)

type Server struct {
	server http.Server
}

func New() *Server {
	return &Server{
		server: http.Server{
			Addr:    ":8080",
			Handler: routes(),
		},
	}
}

func (s *Server) Run() error {
	return s.server.ListenAndServe()
}
func (s *Server) Close() {
	s.server.Close()
}
