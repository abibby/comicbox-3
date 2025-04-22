package migrations

import (
	"context"

	"github.com/abibby/salusa/database"
	"github.com/abibby/salusa/database/migrate"
	"github.com/abibby/salusa/database/schema"
)

func init() {
	migrations.Add(&migrate.Migration{
		Name: "20250422_084103-add_series_directories",
		Up: schema.Run(func(ctx context.Context, tx database.DB) error {
			_, err := tx.ExecContext(ctx, `
			UPDATE series
			SET directory=COALESCE(
				(
					SELECT
						SUBSTRING(file, 0, INSTR(SUBSTRING(file, 2), '/')+ 1) as directory
					FROM
						books
					WHERE
						books.series = series.name
					GROUP BY series, SUBSTRING(file, 0, INSTR(SUBSTRING(file, 2), '/')+ 1)
					ORDER BY count(*) desc
					LIMIT 1
				),
				""
			)`)
			return err
		}),
		Down: schema.Run(func(ctx context.Context, tx database.DB) error {
			return nil
		}),
	})
}
