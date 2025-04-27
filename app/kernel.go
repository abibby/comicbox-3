package app

import (
	"context"
	"fmt"
	"net/http"

	"github.com/abibby/comicbox-3/app/bootstrap"
	"github.com/abibby/comicbox-3/app/events"
	"github.com/abibby/comicbox-3/app/jobs"
	"github.com/abibby/comicbox-3/app/providers"
	"github.com/abibby/comicbox-3/config"
	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/database/migrations"
	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/server"
	"github.com/abibby/comicbox-3/server/auth"
	"github.com/abibby/salusa/clog"
	salusadb "github.com/abibby/salusa/database"
	"github.com/abibby/salusa/database/databasedi"
	"github.com/abibby/salusa/di"
	"github.com/abibby/salusa/event"
	"github.com/abibby/salusa/event/cron"
	"github.com/abibby/salusa/kernel"
	"github.com/abibby/salusa/openapidoc"
	"github.com/abibby/salusa/openapidoc/openapidocdi"
	"github.com/abibby/salusa/request"
	"github.com/go-openapi/spec"
	"github.com/jmoiron/sqlx"
)

func init() {
	openapidoc.RegisterSchema[database.Time](spec.DateTimeProperty())
}

var Kernel = kernel.New(
	kernel.Config(config.Load),
	kernel.Bootstrap(
		config.Init,

		bootstrap.SetupDatabase(),

		clog.Register,
		request.Register,
		databasedi.RegisterFromConfig(migrations.Use()),
		databasedi.RegisterTransactions(database.Mutex()),
		event.RegisterChannelQueue,
		openapidocdi.Register,

		database.Init,
		events.RegisterSync,
		providers.Register,
	),
	kernel.APIDocumentation(
		openapidoc.Info(spec.InfoProps{
			Title: "ComicBox",
		}),
		openapidoc.AddSecurityDefinition("Query", &spec.SecuritySchemeProps{
			Type: "apiKey",
			In:   "query",
			Name: "_token",
		}),
		openapidoc.AddDefaultSecurityDefinition(),
	),
	kernel.Services(
		cron.Service(),
		event.Service(
			event.NewListener[*jobs.SyncHandler](),
			event.NewListener[*jobs.UpdateMetadataHandler](),
		),
	),
	kernel.InitRoutes(server.InitRouter),
	kernel.FetchAuth(func(ctx context.Context, username string, r *http.Request) error {
		if username == "" {
			return nil
		}
		read, err := di.Resolve[salusadb.Read](ctx)
		if err != nil {
			return err
		}
		user, err := salusadb.Value(read, func(tx *sqlx.Tx) (*models.User, error) {
			return models.UserQuery(ctx).Where("username", "=", username).First(tx)
		})
		if err != nil {
			return err
		}

		if user == nil {
			return fmt.Errorf("no user with the username %s", username)
		}

		token, err := auth.GenerateToken(user.ID, auth.WithPurpose(auth.ScopeAPI, auth.ScopeImage))
		if err != nil {
			return err
		}
		r.Header.Set("Authorization", fmt.Sprintf("Bearer %s", token))
		return nil
	}),
)
