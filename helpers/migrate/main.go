package main

import (
	"context"

	"github.com/abibby/comicbox-3/database"
	_ "github.com/abibby/comicbox-3/server"
	"github.com/jmoiron/sqlx"
	_ "modernc.org/sqlite"
)

func check(err error) {
	if err != nil {
		panic(err)
	}
}

func main() {
	dbPath := "./db.sqlite"
	ctx := context.Background()
	// newDB, err := sqlx.Open("sqlite", config.DBPath)
	// check(err)
	err := database.Open(dbPath)
	check(err)
	err = database.Migrate(dbPath)
	check(err)
	db, err := sqlx.Open("sqlite", "./prod-db.sqlite")
	check(err)

	// migrateBooks(ctx, db)
	// migrateUsers(ctx, db)
	// migrateUserSeries(ctx, db)
	migrateUserBook(ctx, db)
}
