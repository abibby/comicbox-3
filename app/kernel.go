package app

import (
	"github.com/abibby/comicbox-3/app/bootstrap"
	"github.com/abibby/comicbox-3/app/events"
	"github.com/abibby/comicbox-3/app/jobs"
	"github.com/abibby/comicbox-3/config"
	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/database/migrations"
	"github.com/abibby/comicbox-3/server"
	"github.com/abibby/salusa/clog"
	"github.com/abibby/salusa/database/databasedi"
	"github.com/abibby/salusa/event"
	"github.com/abibby/salusa/event/cron"
	"github.com/abibby/salusa/kernel"
	"github.com/abibby/salusa/openapidoc"
	"github.com/abibby/salusa/openapidoc/openapidocdi"
	"github.com/abibby/salusa/request"
	"github.com/go-openapi/spec"
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
		),
	),
	kernel.InitRoutes(server.InitRouter),
)
