package database

import (
	"context"

	"github.com/abibby/comicbox-3/migrations"
)

func Migrate() error {
	return migrations.Use().Up(context.Background(), database)
}
