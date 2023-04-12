package database

import (
	"embed"

	"github.com/golang-migrate/migrate/v4"

	"github.com/golang-migrate/migrate/v4/database/sqlite"
	"github.com/golang-migrate/migrate/v4/source/iofs"
)

//go:embed migrations/*
var migrationsFS embed.FS

func Migrate() error {
	source, err := iofs.New(migrationsFS, "migrations")
	if err != nil {
		return err
	}
	driver, err := sqlite.WithInstance(database.DB, &sqlite.Config{})
	if err != nil {
		return err
	}
	m, err := migrate.NewWithInstance("iofs", source, "sqlite://", driver)
	if err != nil {
		return err
	}

	err = m.Up()
	if err == migrate.ErrNoChange {
	} else if err != nil {
		return err
	}
	err = source.Close()
	if err != nil {
		return err
	}
	return nil
}
