package models_test

import (
	"context"
	"testing"

	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/models/factory"
	"github.com/abibby/comicbox-3/test"
	"github.com/jmoiron/sqlx"
	"github.com/stretchr/testify/assert"
	"gosalusa.com/database/model"
	"gosalusa.com/di"
	"gosalusa.com/optional"
	"gosalusa.com/router"
)

func TestUserSeries_save(t *testing.T) {
	test.Run(t, "sets latest book on creation", func(ctx context.Context, t *testing.T, tx *sqlx.Tx) {
		user := factory.User.Create(tx)
		ctx = test.WithUser(ctx, user)

		di.RegisterSingleton(ctx, func() router.URLResolver {
			return router.NewTestResolver()
		})

		seriesSlug := "slug"
		chapter := float64(0)

		books := factory.Book.State(func(b *models.Book) {
			chapter++
			b.SeriesSlug = seriesSlug
			b.Chapter = optional.Some(chapter)
			b.Volume = optional.Some(1.0)
			b.Pages = []*models.Page{{}, {}}
			factory.UserBook.State(func(ub *models.UserBook) {
				ub.BookID = b.ID
				ub.UserID = user.ID
				if chapter < 3 {
					ub.CurrentPage = len(b.Pages) - 1
				}
			}).Create(tx)
		}).Count(3).Create(tx)

		model.MustSaveContext(ctx, tx, &models.UserSeries{
			SeriesSlug: seriesSlug,
			UserID:     user.ID,
		})

		us, err := models.UserSeriesQuery(ctx).Get(tx)
		assert.NoError(t, err)
		assert.Len(t, us, 1)
		assert.True(t, us[0].LatestBookID.Valid)
		assert.Equal(t, books[0].ID.String(), us[0].LatestBookID.UUID.String())

	})
}
