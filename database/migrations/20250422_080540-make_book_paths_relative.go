package migrations

import (
	"context"

	"abibby.com/salusa/database"
	"abibby.com/salusa/database/migrate"
	"abibby.com/salusa/database/schema"
	"github.com/abibby/comicbox-3/config"
)

func init() {
	migrations.Add(&migrate.Migration{
		Name: "20250422_080540-make_book_paths_relative",
		Up: schema.Run(func(ctx context.Context, tx database.DB) error {
			_, err := tx.ExecContext(ctx, `UPDATE books SET file=REPLACE(file, ?, ?)`, config.LibraryPath, "")
			return err
		}),
		Down: schema.Run(func(ctx context.Context, tx database.DB) error {
			_, err := tx.ExecContext(ctx, `UPDATE books SET file=CONCAT(?, file)`, config.LibraryPath)
			return err
		}),
	})
}
