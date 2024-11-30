package migrations

import (
	"github.com/abibby/salusa/database/migrate"
	"github.com/abibby/salusa/database/schema"
)

func init() {
	migrations.Add(&migrate.Migration{
		Name: "20241129_192620-Series",
		Up: schema.Table("series", func(table *schema.Blueprint) {
			table.String("display_name")
		}),
		Down: schema.Table("series", func(table *schema.Blueprint) {
			table.DropColumn("display_name")
		}),
	})
}
