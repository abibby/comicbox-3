package migrations

import (
	"github.com/abibby/salusa/database/migrate"
	"github.com/abibby/salusa/database/schema"
)

func init() {
	migrations.Add(&migrate.Migration{
		Name: "20240302_080912-Role",
		Up: schema.Create("roles", func(table *schema.Blueprint) {
			table.Int("id").Primary().AutoIncrement()
			table.String("name")
		}),
		Down: schema.DropIfExists("roles"),
	})
}
