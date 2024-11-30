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
		Name: "20241129_192841-update_series_slugs",
		Up: schema.Run(func(ctx context.Context, tx database.DB) error {
			err := models.SeriesQuery(ctx).Each(tx, func(m *models.Series) error {
				m.Name = m.Slug
				m.Slug = models.Slug(m.Slug)
				return model.SaveContext(ctx, tx, m)
			})
			if err != nil {
				return err
			}
			err = models.BookQuery(ctx).Each(tx, func(b *models.Book) error {
				b.SeriesSlug = models.Slug(b.SeriesSlug)
				return model.SaveContext(ctx, tx, b)
			})
			if err != nil {
				return err
			}
			return nil
		}),
		Down: schema.Run(func(ctx context.Context, tx database.DB) error {
			return nil
		}),
	})
}
