package migrations

import (
	"github.com/abibby/bob/migrate"
	"github.com/abibby/bob/schema"
)

func init() {
	migrations.Add(&migrate.Migration{
		Name: "20230521_093251-UserSeries",
		Up: schema.Create("user_series", func(table *schema.Blueprint) {
			table.DateTime("created_at")
			table.DateTime("updated_at")
			table.DateTime("deleted_at").Nullable()
			table.JSON("update_map")
			table.String("series_name")
			table.Blob("user_id")
			table.String("list")
			table.DateTime("last_read_at")
			table.ForeignKey("series_name", "series", "name")
			table.ForeignKey("user_id", "users", "id")
			table.PrimaryKey("series_name", "user_id")
		}),
		Down: schema.DropIfExists("user_series"),
	})
}
