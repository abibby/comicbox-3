package factory

import (
	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/salusa/database/dbtest"
	"github.com/go-faker/faker/v4"
	"github.com/google/uuid"
)

var (
	Series = dbtest.NewFactory(func() *models.Series {
		return &models.Series{
			Name: faker.Word(),
		}
	})
	User = dbtest.NewFactory(func() *models.User {
		return &models.User{
			ID:       uuid.MustParse(faker.UUIDHyphenated()),
			Username: faker.Username(),
			Password: []byte(faker.Password()),
		}
	})
	UserSeries = dbtest.NewFactory(func() *models.UserSeries {
		return &models.UserSeries{}
	})
)
