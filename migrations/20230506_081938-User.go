package migrations

import (
	"github.com/abibby/bob/builder"
	"github.com/abibby/bob/migrate"
	"github.com/abibby/bob/schema"
)

func init() {
	migrations.Add(&migrate.Migration{
		Name: "20230506_081938-User",
		Up: func() builder.ToSQLer {
			return schema.Create("users", func(table *schema.Blueprint) {
				table.DateTime("created_at")
				table.DateTime("updated_at")
				table.DateTime("deleted_at").Nullable()
				table.JSON("update_map")
				table.Blob("id").Primary()
				table.String("username")
				table.Blob("password")
				table.String("anilist_grant").Nullable()
				table.String("anilist_token").Nullable()
				table.DateTime("anilist_expires_at").Nullable()
			})
		},
		Down: func() builder.ToSQLer {
			return schema.DropIfExists("users")
		},
	})
}
