package migrations

import (
	"github.com/abibby/salusa/database/migrate"
	"github.com/abibby/salusa/database/schema"
)

func init() {
	migrations.Add(&migrate.Migration{
		Name: "20230521_093248-Series",
		Up: schema.Create("series", func(table *schema.Blueprint) {
			table.DateTime("created_at")
			table.DateTime("updated_at")
			table.DateTime("deleted_at").Nullable()
			table.JSON("update_map")
			table.String("name").Primary()
			table.Blob("first_book_id").Nullable()
			table.Int("first_book_cover_page")
			table.Int("anilist_id").Nullable()
		}),
		Down: schema.DropIfExists("series"),
	})
}
