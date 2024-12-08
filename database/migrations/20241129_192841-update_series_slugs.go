package migrations

import (
	"context"
	"log"

	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/salusa/database"
	"github.com/abibby/salusa/database/migrate"
	"github.com/abibby/salusa/database/model"
	"github.com/abibby/salusa/database/model/mixins"
	"github.com/abibby/salusa/database/schema"
)

func init() {
	migrations.Add(&migrate.Migration{
		Name: "20241129_192841-update_series_slugs",
		Up: schema.Run(func(ctx context.Context, tx database.DB) error {
			var err error

			_, err = tx.ExecContext(ctx, "UPDATE books SET series=slug(series)")
			if err != nil {
				return err
			}

			series, err := models.SeriesQuery(ctx).Get(tx)
			if err != nil {
				return err
			}

			updatedSeries := map[string]*models.Series{}

			for _, s := range series {
				slug := models.Slug(s.Slug)
				existing, ok := updatedSeries[slug]
				if !ok || s.CreatedAt.Time().After(existing.CreatedAt.Time()) {
					updatedSeries[slug] = s
				}
			}

			err = models.SeriesQuery(ctx).WithoutGlobalScope(mixins.SoftDeleteScope).Delete(tx)
			if err != nil {
				return err
			}

			for _, s := range updatedSeries {
				s.BaseModel.BaseModel = model.BaseModel{}
				s.Name = s.Slug
				s.Slug = models.Slug(s.Slug)
				err = model.SaveContext(ctx, tx, s)
				if err != nil {
					return err
				}
			}

			listOrder := map[models.List]int{
				models.ListReading:   0,
				models.ListPaused:    1,
				models.ListPlanning:  2,
				models.ListDropped:   3,
				models.ListCompleted: 4,
				models.ListNone:      5,
			}

			userSeries, err := models.UserSeriesQuery(ctx).WithoutGlobalScope(models.UserScoped).Get(tx)
			if err != nil {
				return err
			}

			updatedUserSeries := map[string]*models.UserSeries{}

			for _, us := range userSeries {
				slug := models.Slug(us.SeriesSlug)
				existing, ok := updatedUserSeries[slug+us.UserID.String()]
				if !ok || listOrder[us.List] < listOrder[existing.List] {
					updatedUserSeries[slug+us.UserID.String()] = us
				}
				if ok {
					log.Print(us.SeriesSlug)
				}
			}

			err = models.UserSeriesQuery(ctx).WithoutGlobalScope(mixins.SoftDeleteScope).WithoutGlobalScope(models.UserScoped).Delete(tx)
			if err != nil {
				return err
			}

			for _, us := range updatedUserSeries {
				us.BaseModel.BaseModel = model.BaseModel{}
				us.SeriesSlug = models.Slug(us.SeriesSlug)
				err = model.SaveContext(ctx, tx, us)
				if err != nil {
					return err
				}
			}

			return nil
		}),
		Down: schema.Run(func(ctx context.Context, tx database.DB) error {
			return nil
		}),
	})
}
