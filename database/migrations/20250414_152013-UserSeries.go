package migrations

import (
	"abibby.com/salusa/database/migrate"
	"abibby.com/salusa/database/schema"
)

func init() {
	migrations.Add(&migrate.Migration{
		Name: "20250414_152013-UserSeries",
		Up: schema.Table("user_series", func(table *schema.Blueprint) {
			table.Blob("latest_book_id").Nullable()
		}),
		Down: schema.Table("user_series", func(table *schema.Blueprint) {
			table.DropColumn("latest_book_id")
		}),
	})
}
