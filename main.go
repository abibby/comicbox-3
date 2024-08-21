package main

import (
	"context"
	"os"

	"github.com/abibby/comicbox-3/app"
	"github.com/abibby/comicbox-3/app/deps"
	"github.com/abibby/salusa/clog"
	"github.com/abibby/salusa/di"
)

func main() {
	ctx := di.ContextWithDependencyProvider(
		context.Background(),
		deps.Provider,
	)

	err := app.Kernel.Bootstrap(ctx)
	if err != nil {
		clog.Use(ctx).Error("error bootstrapping", "error", err)
		os.Exit(1)
	}

	err = app.Kernel.Run(ctx)
	if err != nil {
		clog.Use(ctx).Error("error running", "error", err)
		os.Exit(1)
	}
}
