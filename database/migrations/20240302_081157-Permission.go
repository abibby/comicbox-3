package migrations

import (
	"github.com/abibby/salusa/database/migrate"
	"github.com/abibby/salusa/database/schema"
)

func init() {
	migrations.Add(&migrate.Migration{
		Name: "20240302_081157-Permission",
		Up: schema.Create("permissions", func(table *schema.Blueprint) {
			table.Int("role_id")
			table.String("name")
			table.PrimaryKey("role_id", "name")
		}),
		Down: schema.DropIfExists("permissions"),
	})
}
