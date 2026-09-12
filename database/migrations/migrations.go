package migrations

import (
	"abibby.com/salusa/database/migrate"
)

var migrations = migrate.New()

func Use() *migrate.Migrations {
	return migrations
}
