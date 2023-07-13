package controllers

import (
	"net/http"

	"github.com/abibby/comicbox-3/app"
	"github.com/abibby/comicbox-3/queue"
)

func Sync(w http.ResponseWriter, r *http.Request) {
	queue.Default.EnqueueJob(queue.JobFunc(app.Sync))
	w.WriteHeader(http.StatusNoContent)
}
