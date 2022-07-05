package server

import (
	"encoding/json"
	"fmt"
	"io"
	"io/fs"
	"log"
	"mime"
	"net/http"
	"path"
	"text/template"

	"github.com/abibby/comicbox-3/config"
)

type TemplateData struct {
	Constants string
}

func FileServerDefault(root fs.FS, basePath, fallbackPath string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		p := path.Join(basePath, path.Clean(r.URL.Path)[1:])

		info, err := fs.Stat(root, p)
		if err != nil || info.IsDir() {
			t, err := template.ParseFS(root, path.Join(basePath, fallbackPath))
			if err != nil {
				log.Print(err)
				return
			}

			constants := map[string]string{
				"ANILIST_CLIENT_ID": config.AnilistClientID,
			}

			src := ""
			for name, value := range constants {
				b, err := json.Marshal(value)
				if err != nil {
					log.Print(err)
					return
				}
				src += "var " + name + "=" + string(b)
			}

			w.Header().Add("Content-Type", "text/html")
			err = t.Execute(w, TemplateData{
				Constants: fmt.Sprintf("<script>%s</script>", src),
			})
			if err != nil {
				log.Print(err)
				return
			}
			return
		}

		f, err := root.Open(p)
		if err != nil {
			log.Print(err)
			return
		}

		w.Header().Add("Content-Type", mime.TypeByExtension(path.Ext(p)))

		_, err = io.Copy(w, f)
		if err != nil {
			log.Print(err)
			return
		}
	})
}
