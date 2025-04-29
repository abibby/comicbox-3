package test

import (
	"context"
	"testing"

	"github.com/abibby/comicbox-3/app/bootstrap"
	"github.com/abibby/comicbox-3/app/deps"
	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/database/migrations"
	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/server/auth"
	"github.com/abibby/salusa/database/dbtest"
	"github.com/abibby/salusa/database/dialects/sqlite"
	"github.com/abibby/salusa/di"
	"github.com/golang-jwt/jwt/v4"
	"github.com/jmoiron/sqlx"
)

var r = dbtest.NewRunner(func() (*sqlx.DB, error) {
	ctx := context.Background()
	err := bootstrap.SetupDatabase()(ctx)
	if err != nil {
		return nil, err
	}
	sqlite.UseSQLite()
	db, err := sqlx.Open(bootstrap.DriverName, ":memory:")
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

func Run(t *testing.T, name string, cb func(ctx context.Context, t *testing.T, tx *sqlx.Tx)) bool {
	return r.Run(t, name, func(t *testing.T, tx *sqlx.Tx) {
		ctx := context.Background()
		ctx = di.ContextWithDependencyProvider(ctx, deps.Provider)
		cb(ctx, t, tx)
	})
}

var RunBenchmark = r.RunBenchmark

func WithUser(ctx context.Context, user *models.User) context.Context {
	return auth.ContextWithClaims(ctx, &auth.Claims{
		RegisteredClaims: jwt.RegisteredClaims{
			Subject: user.ID.String(),
		},
	})
}
