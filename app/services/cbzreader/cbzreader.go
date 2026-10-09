package cbzreader

import (
	"archive/zip"
	"context"
	"io/fs"

	"gosalusa.com/kernel"
)

type Service struct {
	requests chan *Request
	cache    map[string]fs.File

	Fsys fs.FS `inject:""`
}

type Request struct {
	Path string
}

var _ kernel.Service = (*Service)(nil)

// Name implements [kernel.Service].
func (s *Service) Name() string {
	return "comicbox:cbz-reader"
}

// Run implements [kernel.Service].
func (s *Service) Run(ctx context.Context) error {
	return nil
}

func (s *Service) Open(path string) (*zip.Reader, error) {
	return nil, nil
}
