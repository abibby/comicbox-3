package migrations

import (
	"github.com/abibby/salusa/database/migrate"
	"github.com/abibby/salusa/database/schema"
)

func init() {
	migrations.Add(&migrate.Migration{
		Name: "20250429_074615-Series",
		Up: schema.Table("series", func(table *schema.Blueprint) {
			table.JSON("locked_fields").Default("[]")
		}),
		Down: schema.Table("series", func(table *schema.Blueprint) {
			table.DropColumn("locked_fields")
		}),
	})
}
