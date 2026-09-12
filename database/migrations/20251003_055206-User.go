package migrations

import (
	"abibby.com/salusa/database/migrate"
	"abibby.com/salusa/database/schema"
)

func init() {
	migrations.Add(&migrate.Migration{
		Name: "20251003_055206-User",
		Up: schema.Table("users", func(table *schema.Blueprint) {
			table.Int("role_id").Default(2)
			// table.ForeignKey("role_id", "roles", "id")
		}),
		Down: schema.Table("users", func(table *schema.Blueprint) {
			table.DropColumn("role_id")
		}),
	})
}
