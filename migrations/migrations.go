package migrations

import (
	"github.com/abibby/bob/migrate"
)

var migrations = migrate.New()

func Use() *migrate.Migrations {
	return migrations
}
