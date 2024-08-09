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

// func main2() {
// 	err := config.Init()
// 	if err != nil {
// 		log.Fatalf("Error loading .env file: %v", err)
// 	}

// 	db, err := database.Open(config.DBPath)
// 	if err != nil {
// 		log.Fatal(err)
// 	}

// 	log.Print("Running migrations")
// 	err = migrations.Use().Up(context.Background(), db)
// 	if err != nil {
// 		log.Fatal(err)
// 	}
// 	log.Print("Finished migrations")

// 	s := server.New()

// 	c := make(chan os.Signal, 1)
// 	signal.Notify(c, os.Interrupt)
// 	go func() {
// 		tries := 0
// 		for range c {
// 			if tries == 0 {
// 				go func() {
// 					log.Print("Gracefully shutting down server Ctrl+C again to force")
// 					s.Close()
// 					_ = database.Close()
// 					queue.Default.Close()
// 					os.Exit(1)
// 				}()
// 			} else {
// 				log.Print("Force shutting down server")
// 				os.Exit(1)
// 			}
// 			tries++
// 		}
// 	}()

// 	queue.Default.Start()
// 	if config.ScanInterval != "" {
// 		err := queue.Default.ScheduleJob(config.ScanInterval, queue.JobFunc(jobs.Sync))
// 		if err != nil {
// 			log.Print(err)
// 		}
// 	}
// 	if config.ScanOnStartup {
// 		queue.Default.EnqueueJob(queue.JobFunc(jobs.Sync))
// 	}

// 	log.Printf("Server started at http://localhost:%d", config.Port)
// 	log.Fatal(s.Run())
// }
