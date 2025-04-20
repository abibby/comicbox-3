package bootstrap

import (
	"context"
	"database/sql"

	"github.com/abibby/comicbox-3/models"
	"github.com/mattn/go-sqlite3"
)

const DriverName = "sqlite3_custom"

func SetupDatabase() func(ctx context.Context) error {
	return func(ctx context.Context) error {
		sql.Register(DriverName, &sqlite3.SQLiteDriver{
			ConnectHook: func(conn *sqlite3.SQLiteConn) error {
				if err := conn.RegisterFunc("slug", models.Slug, true); err != nil {
					return err
				}
				return nil
			},
		})

		return nil
	}
}
