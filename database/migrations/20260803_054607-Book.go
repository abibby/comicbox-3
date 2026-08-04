package migrations

import (
	"github.com/abibby/salusa/database/migrate"
	"github.com/abibby/salusa/database/schema"
)

func init() {
	migrations.Add(&migrate.Migration{
		Name: "20260803_054607-Book",
		Up: schema.Table("books", func(table *schema.Blueprint) {
			table.String("cover_blur_hash").Default("")
		}),
		Down: schema.Table("books", func(table *schema.Blueprint) {
			table.DropColumn("cover_blur_hash")
		}),
	})
}
