package database

import (
	"context"
	"database/sql"
	"sync"

	"github.com/jmoiron/sqlx"
	// _ "modernc.org/sqlite"
	_ "github.com/mattn/go-sqlite3"

	_ "github.com/abibby/bob/dialects/sqlite"
)

var database *sqlx.DB
var testTx *sqlx.Tx

// there seems to be an error with modernc.org/sqlite that requires a lock. If
// it becomes an issue I may need to add CGO and switch to
// github.com/mattn/go-sqlite3
var mtx = &sync.RWMutex{}

func Open(dsnURI string) error {
	db, err := sqlx.Open("sqlite", dsnURI)
	if err != nil {
		return err
	}
	database = db
	return nil
}

func Close() error {
	if database == nil {
		return nil
	}
	return database.Close()
}

func SetTestDB(db *sqlx.DB) {
	database = db
}
func SetTestTx(tx *sqlx.Tx) {
	testTx = tx
}

func ReadTx(ctx context.Context, cb func(tx *sqlx.Tx) error) error {
	mtx.RLock()
	defer mtx.RUnlock()
	return transaction(ctx, &sql.TxOptions{ReadOnly: true}, cb)
}
func UpdateTx(ctx context.Context, cb func(tx *sqlx.Tx) error) error {
	mtx.Lock()
	defer mtx.Unlock()
	return transaction(ctx, &sql.TxOptions{ReadOnly: false}, cb)
}

func transaction(ctx context.Context, opts *sql.TxOptions, cb func(tx *sqlx.Tx) error) error {
	if testTx != nil {
		return cb(testTx)
	}
	tx, err := database.BeginTxx(ctx, opts)
	if err != nil {
		return err
	}

	err = cb(tx)
	if err != nil {
		rbErr := tx.Rollback()
		if rbErr != nil {
			return rbErr
		}
		return err
	}
	return tx.Commit()
}
