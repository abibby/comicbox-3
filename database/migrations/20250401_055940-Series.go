package migrations

import (
	"github.com/abibby/salusa/database/migrate"
	"github.com/abibby/salusa/database/schema"
)

func init() {
	migrations.Add(&migrate.Migration{
		Name: "20250401_055940-Series",
		Up: schema.Table("series", func(table *schema.Blueprint) {
			table.String("directory").Default("")
			table.String("metadata_id").Nullable()
			table.String("description").Default("")
			table.JSON("aliases").Default("[]")
			table.JSON("genres").Default("[]")
			table.JSON("tags").Default("[]")
			table.Int("year").Nullable()
			table.String("cover_image_path").Default("")
			table.DateTime("metadata_updated_at").Nullable()
			table.DropColumn("first_book_id")
			table.DropColumn("first_book_cover_page")
		}),
		Down: schema.Table("series", func(table *schema.Blueprint) {
			table.Blob("first_book_id").Nullable()
			table.Int("first_book_cover_page")
			table.DropColumn("directory")
			table.DropColumn("metadata_id")
			table.DropColumn("description")
			table.DropColumn("aliases")
			table.DropColumn("genres")
			table.DropColumn("tags")
			table.DropColumn("year")
			table.DropColumn("cover_image_path")
			table.DropColumn("metadata_updated_at")
		}),
	})
}
