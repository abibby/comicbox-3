package migrations

import (
	"github.com/abibby/salusa/database/migrate"
	"github.com/abibby/salusa/database/schema"
)

func init() {
	migrations.Add(&migrate.Migration{
		Name: "20250405_073145-File",
		Up: schema.Create("files", func(table *schema.Blueprint) {
			table.DateTime("created_at")
			table.DateTime("updated_at")
			table.DateTime("deleted_at").Nullable()
			table.JSON("update_map")
			table.Blob("id").Primary()
			table.String("path")
			table.String("name")
			table.Blob("user_id").Nullable()
		}),
		Down: schema.DropIfExists("files"),
	})
}
