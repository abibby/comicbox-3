package bootstrap

import (
	"context"
	"database/sql"
	"path"

	"abibby.com/salusa/database/dialects"
	"abibby.com/salusa/database/dialects/sqlite"
	"github.com/abibby/comicbox-3/models"
	"github.com/mattn/go-sqlite3"
)

const DriverName = "sqlite3_custom"

func SetupDatabase(ctx context.Context) error {
	dialects.Register(DriverName, sqlite.New)
	sql.Register(DriverName, &sqlite3.SQLiteDriver{
		ConnectHook: func(conn *sqlite3.SQLiteConn) error {
			if err := conn.RegisterFunc("slug", models.Slug, true); err != nil {
				return err
			}
			if err := conn.RegisterFunc("dir", path.Dir, true); err != nil {
				return err
			}
			return nil
		},
	})

	return nil
}
