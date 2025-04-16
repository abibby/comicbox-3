package migrations

import (
	"context"

	"github.com/abibby/salusa/database"
	"github.com/abibby/salusa/database/migrate"
	"github.com/abibby/salusa/database/schema"
)

func init() {
	migrations.Add(&migrate.Migration{
		Name: "20250414_152240-populate_latest_book_id",
		Up: schema.Run(func(ctx context.Context, tx database.DB) error {
			_, err := tx.ExecContext(ctx, `
				update
					user_series
				set
					latest_book_id = (
						select
							books.id
						from
							books
						left join user_books on
							books.id = user_books.book_id
							and user_series.user_id = user_books.user_id
						where
							(user_books.current_page is null
								or user_books.current_page < books.page_count - 1)
							and books.series = user_series.series_name
							and books.page_count > 1
						order by
							sort
						limit 1
					)
			`)
			return err
		}),
		Down: schema.Run(func(ctx context.Context, tx database.DB) error {
			return nil
		}),
	})
}
