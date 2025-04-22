package migrations

import (
	"github.com/abibby/salusa/database/migrate"
	"github.com/abibby/salusa/database/schema"
)

func init() {
	migrations.Add(&migrate.Migration{
		Name: "20250422_083552-Series",
		Up: schema.Table("series", func(table *schema.Blueprint) {
			table.String("directory").Default("")
			table.String("cover_image_path").Default("")
			table.DropColumn("first_book_id")
			table.DropColumn("first_book_cover_page")
			table.DropColumn("cover_image_id")
		}),
		Down: schema.Table("series", func(table *schema.Blueprint) {
			table.Blob("first_book_id").Nullable()
			table.Int("first_book_cover_page")
			table.Blob("cover_image_id").Nullable()
			table.DropColumn("directory")
			table.DropColumn("cover_image_path")
		}),
	})
}
