package migrations

import (
	"gosalusa.com/database/migrate"
)

var migrations = migrate.New()

func Use() *migrate.Migrations {
	return migrations
}
