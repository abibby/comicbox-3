package factory

import (
	"math"
	"math/rand/v2"

	"github.com/abibby/comicbox-3/models"
	"github.com/go-faker/faker/v4"
	"github.com/google/uuid"
	"gosalusa.com/database"
	"gosalusa.com/database/dbtest"
	"gosalusa.com/optional"
)

var (
	Series = dbtest.NewFactory(func(tx database.DB) *models.Series {
		return &models.Series{
			Slug: faker.Word(),
		}
	})
	User = dbtest.NewFactory(func(tx database.DB) *models.User {
		return &models.User{
			ID:       uuid.MustParse(faker.UUIDHyphenated()),
			Username: faker.Username(),
			Password: []byte(faker.Password()),
		}
	})
	UserSeries = dbtest.NewFactory(func(tx database.DB) *models.UserSeries {
		return &models.UserSeries{}
	})
	Book = dbtest.NewFactory(func(tx database.DB) *models.Book {
		return &models.Book{
			ID:      uuid.New(),
			Title:   faker.Word(),
			Chapter: optional.Some(math.Floor(rand.Float64() * 1000)),
			Volume:  optional.Some(math.Floor(rand.Float64() * 1000)),
		}
	})
	UserBook = dbtest.NewFactory(func(tx database.DB) *models.UserBook {
		return &models.UserBook{}
	})
)
