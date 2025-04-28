package jobs

import (
	"context"
	"fmt"
	"log/slog"
	"reflect"

	"github.com/abibby/comicbox-3/app/events"
	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/server/metadata"
	"github.com/abibby/salusa/database"
	"github.com/abibby/salusa/database/model"
	"github.com/abibby/salusa/event"
	"github.com/jmoiron/sqlx"
)

type UpdateMetadataHandler struct {
	DB     *sqlx.DB        `inject:""`
	Update database.Update `inject:""`
	Log    *slog.Logger    `inject:""`
}

var _ event.Handler[*events.UpdateMetadataEvent] = (*UpdateMetadataHandler)(nil)

// Handle implements event.Handler.
func (u *UpdateMetadataHandler) Handle(ctx context.Context, event *events.UpdateMetadataEvent) error {
	u.Log.Warn("Starting series metadata scan")
	defer u.Log.Warn("Finished series metadata scan")

	meta := metadata.MetaProviderFactory()

	q := models.SeriesQuery(ctx).Limit(50)
	if event.SeriesSlug == "" {
		q = q.OrWhere("metadata_updated_at", "=", nil)
	} else {
		q = q.Where("name", "=", event.SeriesSlug)
	}
	for {
		seriesList, err := q.Get(u.DB)
		if err != nil {
			return err
		}
		if len(seriesList) == 0 {
			return nil
		}

		for _, ogSeries := range seriesList {

			bestMatch, err := metadata.GetBestMatch(ctx, meta, ogSeries)
			if err != nil {
				u.Log.Warn("failed to retrieve metadata", "series", ogSeries.Slug, "err", err)
				continue
			}
			err = u.Update(func(tx *sqlx.Tx) error {
				series, err := models.SeriesQuery(ctx).Find(tx, ogSeries.Slug)
				if err != nil {
					return err
				}

				if !reflect.DeepEqual(ogSeries, series) {
					u.Log.Warn("series changed, skipping metadata update", "series", series.Slug)
					return nil
				}

				err = metadata.ApplyMetadata(ctx, tx, series, &bestMatch.SeriesMetadata)
				if err != nil {
					return fmt.Errorf("failed to update metadata: %w", err)
				}

				err = model.SaveContext(ctx, tx, series)
				if err != nil {
					return err
				}

				return nil
			})
			if err != nil {
				u.Log.Warn("failed to update metadata", "series", ogSeries.Slug, "err", err)
				continue
			}
		}
	}
}
