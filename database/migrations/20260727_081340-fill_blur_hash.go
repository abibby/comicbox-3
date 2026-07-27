package migrations

import (
	"context"

	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/salusa/clog"
	"github.com/abibby/salusa/database"
	"github.com/abibby/salusa/database/migrate"
	"github.com/abibby/salusa/database/model"
	"github.com/abibby/salusa/database/schema"
)

func init() {
	migrations.Add(&migrate.Migration{
		Name: "20260727_081340-fill_blur_hash",
		Up: schema.Run(func(ctx context.Context, tx database.DB) error {
			logger := clog.Use(ctx)
			seriesCount, err := models.SeriesQuery(ctx).Count(tx)
			if err != nil {
				return err
			}
			numFinished := 0
			return models.SeriesQuery(ctx).Each(tx, func(s *models.Series) error {
				defer func() {
					numFinished++
					if numFinished%10 == 0 {
						logger.Info("Updating series blur hash",
							"total", seriesCount,
							"finished", numFinished)
					}
				}()

				err := s.UpdateBlurHash()
				if err != nil {
					logger.Error("Blur hash update failed", "error", err)
					return nil
				}
				err = model.SaveContext(ctx, tx, s)
				if err != nil {
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
