package main

import (
	"log"
	"os"
	"os/signal"

	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/server"
)

func main() {
	log.Print("Running migrations")
	err := database.Migrate("./db.sqlite")
	if err != nil {
		log.Fatal(err)
	}
	log.Print("Finished migrations")

	err = database.Open("./db.sqlite")
	if err != nil {
		log.Fatal(err)
	}

	s := server.New()

	c := make(chan os.Signal, 1)
	signal.Notify(c, os.Interrupt)
	go func() {
		for range c {
			log.Print("shutting down server")
			s.Close()
			database.Close()
			os.Exit(1)
		}
	}()

	log.Print("Server started at http://localhost:8080")
	log.Fatal(s.Run())
}
