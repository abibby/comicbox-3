package main

import (
	"context"
	"os"

	"abibby.com/salusa/clog"
	"abibby.com/salusa/di"
	"github.com/abibby/comicbox-3/app"
	"github.com/abibby/comicbox-3/app/deps"
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
