package migrations

import (
	"gosalusa.com/database/migrate"
	"gosalusa.com/database/schema"
)

func init() {
	migrations.Add(&migrate.Migration{
		Name: "20251003_055201-Role",
		Up: schema.Create("roles", func(table *schema.Blueprint) {
			table.Int("id").Primary().AutoIncrement()
			table.String("name")
			table.JSON("scopes")
		}),
		Down: schema.DropIfExists("roles"),
	})
}
