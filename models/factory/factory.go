package factory

import (
	"github.com/abibby/bob/bobtesting"
	"github.com/abibby/comicbox-3/models"
	"github.com/go-faker/faker/v4"
	"github.com/google/uuid"
)

var (
	Series = bobtesting.NewFactory(func() *models.Series {
		return &models.Series{
			Name: faker.Word(),
		}
	})
	User = bobtesting.NewFactory(func() *models.User {
		return &models.User{
			ID:       uuid.MustParse(faker.UUIDHyphenated()),
			Username: faker.Username(),
			Password: []byte(faker.Password()),
		}
	})
	UserSeries = bobtesting.NewFactory(func() *models.UserSeries {
		return &models.UserSeries{}
	})
)
