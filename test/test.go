package test

import (
	"github.com/abibby/bob/bobtest"
	"github.com/abibby/comicbox-3/database"
	"github.com/jmoiron/sqlx"
)

var r = bobtest.NewRunner(func() (*sqlx.DB, error) {
	db, err := sqlx.Open("sqlite3", ":memory:")
	if err != nil {
		return nil, err
	}
	database.SetTestDB(db)
	err = database.Migrate()
	if err != nil {
		return nil, err
	}
	return db, nil
})

var Run = r.Run
var RunBenchmark = r.RunBenchmark
