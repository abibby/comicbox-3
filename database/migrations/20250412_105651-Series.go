package migrations

import (
	"github.com/abibby/salusa/database/migrate"
	"github.com/abibby/salusa/database/schema"
)

func init() {
	migrations.Add(&migrate.Migration{
		Name: "20250412_105651-Series",
		Up: schema.Table("series", func(table *schema.Blueprint) {
			table.String("description").Default("")
			table.JSON("aliases").Default("[]")
			table.JSON("genres").Default("[]")
			table.JSON("tags").Default("[]")
		}),
		Down: schema.Table("series", func(table *schema.Blueprint) {
			table.DropColumn("description")
			table.DropColumn("aliases")
			table.DropColumn("genres")
			table.DropColumn("tags")
		}),
	})
}
