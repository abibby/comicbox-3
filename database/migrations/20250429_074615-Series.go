package migrations

import (
	"abibby.com/salusa/database/migrate"
	"abibby.com/salusa/database/schema"
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
