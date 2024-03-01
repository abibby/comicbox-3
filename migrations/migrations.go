package migrations

import (
	"github.com/abibby/salusa/database/migrate"
)

var migrations = migrate.New()

func Use() *migrate.Migrations {
	return migrations
}
