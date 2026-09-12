package migrations

import (
	"context"

	"abibby.com/salusa/database"
	"abibby.com/salusa/database/migrate"
	"abibby.com/salusa/database/schema"
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
						dir(file)
					FROM
						books
					WHERE
						books.series = series.name and
						deleted_at is null
					GROUP BY dir(file)
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
