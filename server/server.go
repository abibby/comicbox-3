package server

import (
	"fmt"
	"net/http"

	"github.com/abibby/comicbox-3/config"
	"github.com/abibby/comicbox-3/server/router"
)

type Server struct {
	server http.Server
}

func New() *Server {
	return &Server{
		server: http.Server{
			Addr:    fmt.Sprintf(":%d", config.Port),
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
