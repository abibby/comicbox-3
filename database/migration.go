package database

import (
	"context"

	"github.com/abibby/comicbox-3/migrations"
)

// //go:embed migrations/*
// var migrationsFS embed.FS

func Migrate() error {
	return migrations.Use().Up(context.Background(), database)
}
