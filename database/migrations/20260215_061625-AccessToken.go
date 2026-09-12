package migrations

import (
	"abibby.com/salusa/database/migrate"
	"abibby.com/salusa/database/schema"
)

func init() {
	migrations.Add(&migrate.Migration{
		Name: "20260215_061625-AccessToken",
		Up: schema.Create("access_tokens", func(table *schema.Blueprint) {
			table.DateTime("created_at")
			table.DateTime("updated_at")
			table.DateTime("deleted_at").Nullable()
			table.JSON("update_map")
			table.Blob("id").Primary()
			table.Blob("user_id")
			table.String("name")
			table.Blob("opds")
			table.Blob("koreader")
			table.ForeignKey("user_id", "users", "id")
		}),
		Down: schema.DropIfExists("access_tokens"),
	})
}
