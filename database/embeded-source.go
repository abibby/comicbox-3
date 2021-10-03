package database

import (
	"embed"

	"github.com/golang-migrate/migrate/v4/source"
	"github.com/golang-migrate/migrate/v4/source/iofs"
)

func init() {
	source.Register("embedded", &Embedded{})
}

//go:embed migrations/*
var content embed.FS

type Embedded struct {
	iofs.PartialDriver
	url string
}

func (f *Embedded) Open(url string) (source.Driver, error) {
	nf := &Embedded{url: url}
	if err := nf.Init(content, "migrations"); err != nil {
		return nil, err
	}
	return nf, nil
}
