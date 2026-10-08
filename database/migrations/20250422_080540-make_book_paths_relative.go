package migrations

import (
	"context"

	"github.com/abibby/comicbox-3/config"
	"gosalusa.com/database"
	"gosalusa.com/database/migrate"
	"gosalusa.com/database/schema"
	"gosalusa.com/di"
)

func init() {
	migrations.Add(&migrate.Migration{
		Name: "20250422_080540-make_book_paths_relative",
		Up: schema.Run(func(ctx context.Context, tx database.DB) error {
			cfg, err := di.Resolve[*config.Config](ctx)
			if err != nil {
				return err
			}
			_, err = tx.ExecContext(ctx, `UPDATE books SET file=REPLACE(file, ?, ?)`, cfg.LibraryPath, "")
			return err
		}),
		Down: schema.Run(func(ctx context.Context, tx database.DB) error {
			cfg, err := di.Resolve[*config.Config](ctx)
			if err != nil {
				return err
			}
			_, err = tx.ExecContext(ctx, `UPDATE books SET file=CONCAT(?, file)`, cfg.LibraryPath)
			return err
		}),
	})
}
