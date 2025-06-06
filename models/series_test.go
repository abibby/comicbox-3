package models_test

import (
	"testing"

	"github.com/abibby/comicbox-3/models"
)

func FromSeries(s *models.Series) func(us *models.UserSeries) {
	return func(us *models.UserSeries) {
		us.SeriesSlug = s.Slug
	}
}
func FromUser(u *models.User) func(us *models.UserSeries) {
	return func(us *models.UserSeries) {
		us.UserID = u.ID
	}
}

// func TestSeries(t *testing.T) {
// 	test.Run(t, "", func(ctx context.Context, t *testing.T, tx *sqlx.Tx) {
// 		u := factory.User.Create(tx)

// 		factory.UserSeries.
// 			State(FromSeries(factory.Series.Create(tx))).
// 			State(FromUser(u)).
// 			State(func(us *models.UserSeries) {
// 				us.List = models.ListDropped
// 			}).
// 			Create(tx)

// 		ctx = test.WithUser(ctx, u)

// 		s, err := models.SeriesQuery(ctx).
// 			With("UserSeries").
// 			Get(tx)
// 		assert.NoError(t, err)

// 		if !assert.Len(t, s, 1) {
// 			return
// 		}
// 		us, ok := s[0].UserSeries.Value()
// 		assert.True(t, ok)
// 		assert.Equal(t, models.ListDropped, us.List)
// 		// SeriesQuery(userContext()).Find()
// 	})
// }

func TestSlug(t *testing.T) {
	type args struct {
		s string
	}
	tests := []struct {
		name string
		args args
		want string
	}{
		{"no-change", args{"no-change"}, "no-change"},
		{"to-lower", args{"To-Lower"}, "to-lower"},
		{"spaces", args{"has spaces"}, "has-spaces"},
		{"collapse-dashes", args{"collapse - dashes"}, "collapse-dashes"},
	}
	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := models.Slug(tt.args.s); got != tt.want {
				t.Errorf("Slug() = %v, want %v", got, tt.want)
			}
		})
	}
}
