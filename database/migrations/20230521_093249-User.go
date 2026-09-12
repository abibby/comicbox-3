package migrations

import (
	"abibby.com/salusa/database/migrate"
	"abibby.com/salusa/database/schema"
)

func init() {
	migrations.Add(&migrate.Migration{
		Name: "20230521_093253-User",
		Up: schema.Create("users", func(table *schema.Blueprint) {
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
		}),
		Down: schema.DropIfExists("users"),
	})
}
