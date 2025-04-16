package migrations

import (
	"github.com/abibby/salusa/database/migrate"
	"github.com/abibby/salusa/database/schema"
)

func init() {
	migrations.Add(&migrate.Migration{
		Name: "20250414_152013-UserSeries",
		Up: schema.Table("user_series", func(table *schema.Blueprint) {
			table.Blob("latest_book_id").Nullable()
			// table.ForeignKey("latest_book_id", "books", "id")
		}),
		Down: schema.Table("user_series", func(table *schema.Blueprint) {
			table.DropColumn("latest_book_id")
		}),
	})
}
