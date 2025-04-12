package migrations

import (
	"github.com/abibby/salusa/database/migrate"
	"github.com/abibby/salusa/database/schema"
)

func init() {
	migrations.Add(&migrate.Migration{
		Name: "20250401_055940-Series",
		Up: schema.Table("series", func(table *schema.Blueprint) {
			table.Blob("cover_image_id").Nullable()
			table.String("metadata_id").Nullable()
		}),
		Down: schema.Table("series", func(table *schema.Blueprint) {
			table.DropColumn("cover_image_id")
			table.DropColumn("metadata_id")
		}),
	})
}
