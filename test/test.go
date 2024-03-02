package test

import (
	"context"

	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/database/migrations"
	"github.com/abibby/salusa/database/dbtest"
	"github.com/abibby/salusa/database/dialects/sqlite"
	"github.com/jmoiron/sqlx"
)

var r = dbtest.NewRunner(func() (*sqlx.DB, error) {
	sqlite.UseSQLite()
	db, err := sqlx.Open("sqlite", ":memory:")
	if err != nil {
		return nil, err
	}
	database.SetTestDB(db)
	err = migrations.Use().Up(context.Background(), db)
	if err != nil {
		return nil, err
	}
	return db, nil
})

var Run = r.Run
var RunBenchmark = r.RunBenchmark
