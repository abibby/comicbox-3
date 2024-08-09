package database

import (
	"context"
	"database/sql"
	"sync"

	"github.com/abibby/salusa/clog"
	"github.com/abibby/salusa/di"
	"github.com/jmoiron/sqlx"
)

var database *sqlx.DB
var testTx *sqlx.Tx

var mtx = &sync.RWMutex{}

func Mutex() *sync.RWMutex {
	return mtx
}

func Init(ctx context.Context) error {
	db, err := di.Resolve[*sqlx.DB](ctx)
	if err != nil {
		return err
	}
	database = db
	return nil
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
	defer func() {
		e := recover()
		if e == nil {
			return
		}
		err = tx.Rollback()
		if err != nil {
			clog.Use(ctx).Error("rollback failed", "err", err)
		}
		panic(e)
	}()
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
