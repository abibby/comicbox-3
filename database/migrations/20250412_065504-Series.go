package migrations

import (
	"abibby.com/salusa/database/migrate"
	"abibby.com/salusa/database/schema"
)

func init() {
	migrations.Add(&migrate.Migration{
		Name: "20250412_065504-Series",
		Up: schema.Table("series", func(table *schema.Blueprint) {
			table.DropColumn("anilist_id")
		}),
		Down: schema.Table("series", func(table *schema.Blueprint) {
			table.Int("anilist_id").Nullable()
		}),
	})
}
