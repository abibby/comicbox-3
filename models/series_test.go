package models_test

import (
	"context"
	"os"
	"testing"

	"github.com/abibby/bob/bobtesting"
	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/models/factory"
	"github.com/jmoiron/sqlx"
	"github.com/stretchr/testify/assert"
)

func TestMain(m *testing.M) {
	bobtesting.SetMigrate(func(db *sqlx.DB) error {
		database.SetTestDB(db)
		return database.Migrate()
	})
	os.Exit(m.Run())
}

func userContext(u *models.User) context.Context {
	return context.WithValue(context.Background(), "user-id", u.ID)
}

func FromSeries(s *models.Series) func(us *models.UserSeries) *models.UserSeries {
	return func(us *models.UserSeries) *models.UserSeries {
		us.SeriesName = s.Name
		return us
	}
}
func FromUser(u *models.User) func(us *models.UserSeries) *models.UserSeries {
	return func(us *models.UserSeries) *models.UserSeries {
		us.UserID = u.ID
		return us
	}
}

func TestSeries(t *testing.T) {
	bobtesting.RunWithDatabase(t, "", func(t *testing.T, tx *sqlx.Tx) {
		u := factory.User.Create(tx)
		{
			s := factory.Series.Create(tx)
			factory.UserSeries.
				State(FromSeries(s)).
				State(FromUser(u)).
				State(func(us *models.UserSeries) *models.UserSeries {
					us.List = models.ListDropped
					return us
				}).
				Create(tx)
		}

		ctx := userContext(u)

		s, err := models.SeriesQuery(ctx).
			With("UserSeries").
			Get(tx)
		assert.NoError(t, err)

		if !assert.Len(t, s, 1) {
			return
		}
		us, ok := s[0].UserSeries.Value()
		assert.True(t, ok)
		assert.Equal(t, models.ListDropped, us.List)
		// SeriesQuery(userContext()).Find()
	})
}
