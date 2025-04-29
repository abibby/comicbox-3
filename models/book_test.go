package models_test

import (
	"context"
	"testing"

	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/models/factory"
	"github.com/abibby/comicbox-3/test"
	"github.com/abibby/nulls"
	"github.com/abibby/salusa/database/model"
	"github.com/abibby/salusa/di"
	"github.com/abibby/salusa/router"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/stretchr/testify/assert"
)

func TestBook_save(t *testing.T) {
	test.Run(t, "sets latest book on creation", func(ctx context.Context, t *testing.T, tx *sqlx.Tx) {
		user := factory.User.Create(tx)
		ctx = test.WithUser(ctx, user)

		di.RegisterSingleton(ctx, func() router.URLResolver {
			return router.NewTestResolver()
		})

		seriesSlug := "slug"
		chapter := float64(0)

		factory.UserSeries.State(func(us *models.UserSeries) {
			us.SeriesSlug = seriesSlug
			us.UserID = user.ID
		}).Create(tx)

		factory.Book.State(func(b *models.Book) {
			chapter++
			b.SeriesSlug = seriesSlug
			b.Chapter = nulls.NewFloat64(chapter)
			b.Volume = nulls.NewFloat64(1)
			b.Pages = []*models.Page{{}, {}}
			factory.UserBook.State(func(ub *models.UserBook) {
				ub.BookID = b.ID
				ub.UserID = user.ID
				ub.CurrentPage = len(b.Pages) - 1
			}).Create(tx)
		}).Count(3).Create(tx)

		us, err := models.UserSeriesQuery(ctx).Get(tx)
		assert.NoError(t, err)
		assert.Len(t, us, 1)
		assert.False(t, us[0].LatestBookID.Valid)

		book := &models.Book{
			ID:         uuid.New(),
			SeriesSlug: seriesSlug,
		}
		model.MustSaveContext(ctx, tx, book)

		us, err = models.UserSeriesQuery(ctx).Get(tx)
		assert.NoError(t, err)
		assert.Len(t, us, 1)
		assert.True(t, us[0].LatestBookID.Valid)
		assert.Equal(t, book.ID.String(), us[0].LatestBookID.UUID.String())

	})
}
