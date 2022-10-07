package controllers

import (
	"encoding/json"
	"io/fs"
	"net/http"

	"github.com/abibby/comicbox-3/ui"
)

func StaticFiles(rw http.ResponseWriter, r *http.Request) {
	dir, err := fs.ReadDir(ui.Content, "dist")
	if err != nil {
		sendError(rw, err)
		return
	}

	files := make([]string, len(dir))

	for i, f := range dir {
		files[i] = "/" + f.Name()
	}

	rw.Header().Add("Content-Type", "application-json")
	json.NewEncoder(rw).Encode(files)
}
