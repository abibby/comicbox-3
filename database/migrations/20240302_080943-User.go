package migrations

import (
	"github.com/abibby/salusa/database/migrate"
	"github.com/abibby/salusa/database/schema"
)

func init() {
	migrations.Add(&migrate.Migration{
		Name: "20240302_080943-User",
		Up: schema.Table("users", func(table *schema.Blueprint) {
			table.Int("role_id").Nullable()
			table.ForeignKey("role_id", "roles", "id")
		}),
		Down: schema.Table("users", func(table *schema.Blueprint) {
			table.DropColumn("role_id")
		}),
	})
}
