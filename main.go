package main

import (
	"log"
	"os"
	"os/signal"

	"github.com/abibby/comicbox-3/app"
	"github.com/abibby/comicbox-3/config"
	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/queue"
	"github.com/abibby/comicbox-3/server"
)

func main() {
	err := config.Init()
	if err != nil {
		log.Fatalf("Error loading .env file: %v", err)
	}

	log.Print("Running migrations")
	err = database.Migrate(config.DBPath)
	if err != nil {
		log.Fatal(err)
	}
	log.Print("Finished migrations")

	err = database.Open(config.DBPath)
	if err != nil {
		log.Fatal(err)
	}

	s := server.New()

	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt)
	go func() {
		tries := 0
		for range c {
			if tries == 0 {
				go func() {
					log.Print("Grasfully shutting down server Ctrl+C again to force")
					s.Close()
					database.Close()
					queue.Default.Close()
					os.Exit(1)
				}()
			} else {
				log.Print("Force shutting down server")
				os.Exit(1)
			}
			tries++
		}
	}()
	queue.Default.Start()
	queue.Default.ScheduleJob("0 * * * *", queue.JobFunc(app.Sync))
	queue.Default.EnqueueJob(queue.JobFunc(app.Sync))

	log.Printf("Server started at http://localhost:%d", config.Port)
	log.Fatal(s.Run())
}
