package migrations

import (
	"github.com/abibby/bob/builder"
	"github.com/abibby/bob/migrate"
	"github.com/abibby/bob/schema"
)

func init() {
	migrations.Add(&migrate.Migration{
		Name: "20230506_081933-Series",
		Up: func() builder.ToSQLer {
			return schema.Create("series", func(table *schema.Blueprint) {
				table.DateTime("created_at")
				table.DateTime("updated_at")
				table.DateTime("deleted_at").Nullable()
				table.JSON("update_map")
				table.String("name").Primary()
				table.Blob("first_book_id").Nullable()
				table.Int("first_book_cover_page")
				table.Int("anilist_id").Nullable()
				table.Blob("latest_book_id").Nullable()
			})
		},
		Down: func() builder.ToSQLer {
			return schema.DropIfExists("series")
		},
	})
}
