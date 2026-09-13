package migrations

import (
	"context"

	"github.com/abibby/comicbox-3/config"
	"gosalusa.com/database"
	"gosalusa.com/database/migrate"
	"gosalusa.com/database/schema"
)

func init() {
	migrations.Add(&migrate.Migration{
		Name: "20250506_054630-update_cover_image_paths",
		Up: schema.Run(func(ctx context.Context, tx database.DB) error {
			_, err := tx.ExecContext(ctx, `UPDATE series SET cover_image_path=REPLACE(cover_image_path, ?, ?)`, config.LibraryPath, "")
			return err
		}),
		Down: schema.Run(func(ctx context.Context, tx database.DB) error {
			_, err := tx.ExecContext(ctx, `UPDATE series SET cover_image_path=CONCAT(?, cover_image_path)`, config.LibraryPath)
			return err
		}),
	})
}
