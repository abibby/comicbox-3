package test

import (
	"context"
	"log"

	"github.com/abibby/bob/bobtest"
	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/migrations"
	"github.com/jmoiron/sqlx"
)

var r = bobtest.NewRunner(func() (*sqlx.DB, error) {
	db, err := sqlx.Open("sqlite3", ":memory:")
	if err != nil {
		return nil, err
	}
	database.SetTestDB(db)

	err = migrations.Use().Up(context.Background(), db)
	if err != nil {
		log.Fatal(err)
	}
	if err != nil {
		return nil, err
	}
	return db, nil
})

var Run = r.Run
var RunBenchmark = r.RunBenchmark
