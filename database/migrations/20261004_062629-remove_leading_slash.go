package migrations

import (
	"gosalusa.com/database/migrate"
	"gosalusa.com/database/schema"
)

func init() {
	migrations.Add(&migrate.Migration{
		Name: "20261004_062629-remove_leading_slash",
		Up:   schema.Raw(`update books set file=substr(file, 2) where file like '/%';`),
		Down: schema.Raw(`update books set file='/' || file where file not like '/%';`),
	})
}
