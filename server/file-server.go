package server

import (
	"io"
	"io/fs"
	"io/ioutil"
	"log"
	"mime"
	"net/http"
	"path"
)

func FileServerDefault(root fs.FS, basePath, fallbackPath string) http.Handler {
	var fallback []byte
	f, err := root.Open(path.Join(basePath, fallbackPath))
	if err == nil {
		fallback, err = ioutil.ReadAll(f)
		if err != nil {
			fallback = nil
		}
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		p := path.Join(basePath, path.Clean(r.URL.Path)[1:])

		info, err := fs.Stat(root, p)
		if err != nil || info.IsDir() {
			if err != nil {
				log.Print(err)
			}
			w.Write(fallback)
			return
		}

		f, err := root.Open(p)
		if err != nil {
			log.Print(err)
			return
		}

		mediatype := mime.TypeByExtension(path.Ext(p))
		w.Header().Add("Content-Type", mediatype)

		_, err = io.Copy(w, f)
		if err != nil {
			log.Print(err)
			return
		}
	})
}
