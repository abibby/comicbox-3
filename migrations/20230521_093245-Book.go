package migrations

import (
	"github.com/abibby/bob/migrate"
	"github.com/abibby/bob/schema"
)

func init() {
	migrations.Add(&migrate.Migration{
		Name: "20230521_093245-Book",
		Up: schema.Create("books", func(table *schema.Blueprint) {
			table.DateTime("created_at")
			table.DateTime("updated_at")
			table.DateTime("deleted_at").Nullable()
			table.JSON("update_map")
			table.Blob("id").Primary()
			table.String("title")
			table.Float64("chapter").Nullable()
			table.Float64("volume").Nullable()
			table.String("series")
			table.JSON("authors")
			table.JSON("pages")
			table.Int("page_count")
			table.Bool("rtl")
			table.String("sort").Index()
			table.String("file")
			table.ForeignKey("series", "series", "name")
		}),
		Down: schema.DropIfExists("books"),
	})
}
