package migrations

import (
	"abibby.com/salusa/database/migrate"
	"abibby.com/salusa/database/schema"
)

func init() {
	migrations.Add(&migrate.Migration{
		Name: "20230725_153243-Book",
		Up: schema.Table("books", func(table *schema.Blueprint) {
			table.Bool("long_strip").Default(false)
		}),
		Down: schema.Table("books", func(table *schema.Blueprint) {
			table.DropColumn("long_strip")
		}),
	})
}
