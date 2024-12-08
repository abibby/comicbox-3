package bootstrap

import (
	"context"
	"database/sql"

	"github.com/abibby/comicbox-3/models"
	"github.com/mattn/go-sqlite3"
)

func SetupDatabase() func(ctx context.Context) error {
	return func(ctx context.Context) error {
		sql.Register("sqlite3_custom", &sqlite3.SQLiteDriver{
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
