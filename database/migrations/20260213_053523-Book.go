package migrations

import (
	"gosalusa.com/database/migrate"
	"gosalusa.com/database/schema"
)

func init() {
	migrations.Add(&migrate.Migration{
		Name: "20260213_053523-Book",
		Up: schema.Table("books", func(table *schema.Blueprint) {
			table.String("koreader_md5").Default("").Index()
		}),
		Down: schema.Table("books", func(table *schema.Blueprint) {
			table.DropColumn("koreader_md5")
		}),
	})
}
