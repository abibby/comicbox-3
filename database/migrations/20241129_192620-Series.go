package migrations

import (
	"abibby.com/salusa/database/migrate"
	"abibby.com/salusa/database/schema"
)

func init() {
	migrations.Add(&migrate.Migration{
		Name: "20241129_192620-Series",
		Up: schema.Table("series", func(table *schema.Blueprint) {
			table.String("display_name").Default("")
		}),
		Down: schema.Table("series", func(table *schema.Blueprint) {
			table.DropColumn("display_name")
		}),
	})
}
