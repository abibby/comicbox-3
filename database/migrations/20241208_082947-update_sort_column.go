package migrations

import (
	"context"

	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/salusa/database"
	"github.com/abibby/salusa/database/migrate"
	"github.com/abibby/salusa/database/model"
	"github.com/abibby/salusa/database/schema"
)

func init() {
	migrations.Add(&migrate.Migration{
		Name: "20241208_082947-update_sort_column",
		Up: schema.Run(func(ctx context.Context, tx database.DB) error {
			models.BookQuery(ctx).Each(tx, func(v *models.Book) error {
				return model.SaveContext(ctx, tx, v)
			})
			return nil
		}),
		Down: schema.Run(func(ctx context.Context, tx database.DB) error {
			return nil
		}),
	})
}
