package migrations

import (
	"github.com/abibby/bob/builder"
	"github.com/abibby/bob/migrate"
	"github.com/abibby/bob/schema"
)

func init() {
	migrations.Add(&migrate.Migration{
		Name: "20230506_081931-Book",
		Up: func() builder.ToSQLer {
			return schema.Create("books", func(table *schema.Blueprint) {
				table.DateTime("created_at")
				table.DateTime("updated_at")
				table.DateTime("deleted_at").Nullable()
				table.JSON("update_map")
				table.Blob("id").Primary()
				table.String("title")
				table.Float("chapter").Nullable()
				table.Float("volume").Nullable()
				table.String("series")
				table.JSON("authors")
				table.JSON("pages")
				table.Int("page_count")
				table.Bool("rtl")
				table.String("sort")
				table.String("file")
			})
		},
		Down: func() builder.ToSQLer {
			return schema.DropIfExists("books")
		},
	})
}
