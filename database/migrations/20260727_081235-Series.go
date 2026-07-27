package migrations

import (
	"github.com/abibby/salusa/database/migrate"
	"github.com/abibby/salusa/database/schema"
)

func init() {
	migrations.Add(&migrate.Migration{
		Name: "20260727_081235-Series",
		Up: schema.Table("series", func(table *schema.Blueprint) {
			table.String("cover_image_blur_hash").Default("")
		}),
		Down: schema.Table("series", func(table *schema.Blueprint) {
			table.DropColumn("cover_image_blur_hash")
		}),
	})
}
