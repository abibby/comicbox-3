package controllers_test

import (
	_ "github.com/abibby/comicbox-3/server"
)

// func TestSeries(t *testing.T) {
// 	test.Run(t, "", func(t *testing.T, tx *sqlx.Tx) {
// 		database.SetTestTx(tx)

// 		series := factory.Series.Count(5).Create(tx)
// 		u := factory.User.Create(tx)
// 		for _, s := range series {
// 			factory.UserSeries.
// 				State(func(us *models.UserSeries) *models.UserSeries {
// 					us.SeriesName = s.Name
// 					us.UserID = u.ID
// 					us.List = models.ListReading
// 					return us
// 				}).
// 				Create(tx)
// 		}
// 		r := &controllers.PaginatedResponse[*models.Series]{}
// 		Get(controllers.SeriesIndex, "/api/series").ActingAs(u).Json(r)

// 		assert.Equal(t, 5, r.Total)
// 		assert.Len(t, r.Data, 5)

// 		for _, s := range r.Data {
// 			us, ok := s.UserSeries.Value()
// 			assert.True(t, ok)
// 			assert.NotNil(t, us)
// 		}
// 	})
// }
