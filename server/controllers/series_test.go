package controllers_test

import (
	_ "github.com/abibby/comicbox-3/server"
)

// func TestSeries(t *testing.T) {
// 	test.Run(t, "", func(ctx context.Context, t *testing.T, tx *sqlx.Tx) {
// 		database.SetTestTx(tx)

// 		series := factory.Series.Count(5).Create(tx)
// 		u := factory.User.Create(tx)
// 		for _, s := range series {
// 			factory.UserSeries.
// 				State(func(us *models.UserSeries) {
// 					us.SeriesSlug = s.Slug
// 					us.UserID = u.ID
// 					us.List = models.ListReading
// 				}).
// 				Create(tx)
// 		}
// 		test.Kernel(t).
// 			GetJSON("/api/series").
// 			AssertStatus(200)
// 		// Get(controllers.SeriesIndex, "/api/series").ActingAs(u).Json(r)

// 		// assert.Equal(t, 5, r.Total)
// 		// assert.Len(t, r.Data, 5)

// 		// for _, s := range r.Data {
// 		// 	us, ok := s.UserSeries.Value()
// 		// 	assert.True(t, ok)
// 		// 	assert.NotNil(t, us)
// 		// }
// 	})
// }
