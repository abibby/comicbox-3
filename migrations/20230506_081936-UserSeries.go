package migrations

import (
	"github.com/abibby/bob/builder"
	"github.com/abibby/bob/migrate"
	"github.com/abibby/bob/schema"
)

func init() {
	migrations.Add(&migrate.Migration{
		Name: "20230506_081936-UserSeries",
		Up: func() builder.ToSQLer {
			return schema.Create("user_series", func(table *schema.Blueprint) {
				table.DateTime("created_at")
				table.DateTime("updated_at")
				table.DateTime("deleted_at").Nullable()
				table.JSON("update_map")
				table.String("series_name").Primary()
				table.Blob("user_id").Primary()
				table.String("list")
				table.DateTime("last_read_at")
			})
		},
		Down: func() builder.ToSQLer {
			return schema.DropIfExists("user_series")
		},
	})
}
