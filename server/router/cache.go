package router

import (
	"io"
	"log"
	"net/http"
	"os"
	"path"
	"sync"

	"github.com/abibby/comicbox-3/config"
)

type cachedResponseWriter struct {
	body io.Writer
	rw   http.ResponseWriter
}

var _ http.ResponseWriter = &cachedResponseWriter{}

func newCachedResponseWriter(rw http.ResponseWriter, w io.Writer) *cachedResponseWriter {
	return &cachedResponseWriter{
		body: w,
		rw:   rw,
	}
}

func (rw *cachedResponseWriter) Header() http.Header {
	return rw.rw.Header()
}
func (rw *cachedResponseWriter) Write(b []byte) (int, error) {
	return rw.body.Write(b)
}
func (rw *cachedResponseWriter) WriteHeader(statusCode int) {
	rw.rw.WriteHeader(statusCode)
}

func CacheMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(rw http.ResponseWriter, r *http.Request) {
		cachePath := path.Join(config.CachePath, r.URL.Path)
		err := serveFromCache(rw, cachePath)
		if err != nil {
			log.Print(err)
			return
		}

		reader, writer := io.Pipe()
		cacheRW := newCachedResponseWriter(rw, writer)

		wg := &sync.WaitGroup{}
		wg.Add(1)

		var copyErr error
		go func() {
			defer wg.Done()
			err := os.MkdirAll(path.Dir(cachePath), 0777)
			if err != nil {
				copyErr = err
				return
			}
			f, err := os.OpenFile(cachePath, os.O_CREATE|os.O_RDWR, 0644)
			if err != nil {
				copyErr = err
				return
			}
			_, err = io.Copy(rw, io.TeeReader(reader, f))
			if err != nil {
				copyErr = err
				return
			}
		}()

		next.ServeHTTP(cacheRW, r)

		reader.Close()

		wg.Wait()

		if copyErr == io.ErrClosedPipe {
		} else if copyErr != nil {
			log.Print(copyErr)
			return
		}
	})
}

func serveFromCache(rw http.ResponseWriter, cachePath string) error {
	rw.Header().Add("Cache-Control", "max-age=3600")

	f, err := os.Open(cachePath)
	if err == nil {
		_, err = io.Copy(rw, f)
		if err != nil {
			return err
		}
	}
	return nil
}
