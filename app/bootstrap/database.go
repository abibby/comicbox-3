package bootstrap

import (
	"context"
	"database/sql"
	"path"

	"github.com/abibby/comicbox-3/models"
	"github.com/mattn/go-sqlite3"
	"gosalusa.com/database/dialects"
	"gosalusa.com/database/dialects/sqlite"
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
