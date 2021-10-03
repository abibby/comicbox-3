package database

import (
	"github.com/golang-migrate/migrate/v4"
	"github.com/hashicorp/go-multierror"

	_ "github.com/golang-migrate/migrate/v4/database/sqlite"
	_ "github.com/golang-migrate/migrate/v4/source/file"
)

func Migrate(dsnURI string) error {
	m, err := migrate.New(
		"embedded://",
		"sqlite://"+dsnURI,
	)
	if err != nil {
		return err
	}

	err = m.Up()
	if err == migrate.ErrNoChange {
	} else if err != nil {
		return err
	}
	sErr, dbErr := m.Close()
	if sErr != nil || dbErr != nil {
		return multierror.Append(nil, sErr, dbErr)
	}
	return nil
}
