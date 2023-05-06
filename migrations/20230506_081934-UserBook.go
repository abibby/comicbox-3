package migrations

import (
	"github.com/abibby/bob/builder"
	"github.com/abibby/bob/migrate"
	"github.com/abibby/bob/schema"
)

func init() {
	migrations.Add(&migrate.Migration{
		Name: "20230506_081934-UserBook",
		Up: func() builder.ToSQLer {
			return schema.Create("user_books", func(table *schema.Blueprint) {
				table.DateTime("created_at")
				table.DateTime("updated_at")
				table.DateTime("deleted_at").Nullable()
				table.JSON("update_map")
				table.Blob("book_id").Primary()
				table.Blob("user_id").Primary()
				table.Int("current_page")
			})
		},
		Down: func() builder.ToSQLer {
			return schema.DropIfExists("user_books")
		},
	})
}
