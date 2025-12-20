package migrations

import (
	"github.com/abibby/salusa/database/migrate"
	"github.com/abibby/salusa/database/schema"
)

func init() {
	migrations.Add(&migrate.Migration{
		Name: "20251218_081147-File",
		Up: schema.Create("files", func(table *schema.Blueprint) {
			table.String("id").Primary()
			table.DateTime("created_at")
			table.DateTime("updated_at")
			table.DateTime("deleted_at").Nullable()
			table.JSON("update_map")
			table.String("mime")
			table.Int("reference_count")
		}),
		Down: schema.DropIfExists("files"),
	})
}
