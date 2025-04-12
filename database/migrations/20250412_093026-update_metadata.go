package migrations

import (
	"context"
	"errors"

	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/server/metadata"
	"github.com/abibby/salusa/database"
	"github.com/abibby/salusa/database/migrate"
	"github.com/abibby/salusa/database/schema"
)

func init() {
	migrations.Add(&migrate.Migration{
		Name: "20250412_093026-update_metadata",
		Up: schema.Run(func(ctx context.Context, tx database.DB) error {
			provider := metadata.MetaProviderFactory()
			return models.SeriesQuery(ctx).Where("metadata_id", "!=", nil).Each(tx, func(s *models.Series) error {
				err := metadata.Update(ctx, tx, provider, s)
				if !errors.Is(err, metadata.ErrNotFound) {
					return err
				}
				return nil
			})
		}),
		Down: schema.Run(func(ctx context.Context, tx database.DB) error {
			return nil
		}),
	})
}
