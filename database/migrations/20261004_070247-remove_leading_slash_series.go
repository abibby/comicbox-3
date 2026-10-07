package migrations

import (
	"gosalusa.com/database/migrate"
	"gosalusa.com/database/schema"
)

func init() {
	migrations.Add(&migrate.Migration{
		Name: "20261004_070247-remove_leading_slash_series",
		Up:   schema.Raw(`update series set cover_image_path=substr(cover_image_path, 2) where cover_image_path like '/%';`),
		Down: schema.Raw(`update series set cover_image_path='/' || cover_image_path where cover_image_path not like '/%';`),
	})
}
