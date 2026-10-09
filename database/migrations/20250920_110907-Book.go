package migrations

import (
	"gosalusa.com/database/migrate"
	"gosalusa.com/database/schema"
)

func init() {
	migrations.Add(&migrate.Migration{
		Name: "20250920_110907-Book",
		Up: schema.Table("books", func(table *schema.Blueprint) {
			table.Int("download_size").Default(0)
		}),
		Down: schema.Table("books", func(table *schema.Blueprint) {
			table.DropColumn("download_size")
		}),
	})
}
