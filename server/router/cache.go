package router

import (
	"errors"
	"fmt"
	"io"
	"log"
	"net/http"
	"os"
	"path"

	"github.com/abibby/comicbox-3/config"
)

type cachedResponseWriter struct {
	cachePath  string
	cacheFile  *os.File
	statusCode int
	rw         http.ResponseWriter
}

var _ http.ResponseWriter = &cachedResponseWriter{}

func newCachedResponseWriter(rw http.ResponseWriter, path string) *cachedResponseWriter {
	return &cachedResponseWriter{
		cachePath:  path,
		statusCode: 200,
		rw:         rw,
	}
}

func (rw *cachedResponseWriter) Header() http.Header {
	return rw.rw.Header()
}
func (rw *cachedResponseWriter) Write(b []byte) (int, error) {
	_, err := rw.fileWrite(b)
	if err != nil {
		log.Printf("cache write error: %v", err)
	}
	return rw.rw.Write(b)
}
func (rw *cachedResponseWriter) WriteHeader(statusCode int) {
	rw.statusCode = statusCode
	rw.rw.WriteHeader(statusCode)
}

func (rw *cachedResponseWriter) fileWrite(b []byte) (int, error) {
	f, err := rw.file()
	if err != nil {
		return 0, err
	}
	return f.Write(b)
}

func (rw *cachedResponseWriter) file() (*os.File, error) {
	if rw.cacheFile != nil {
		return rw.cacheFile, nil
	}

	if rw.statusCode != 200 {
		return nil, fmt.Errorf("non 200 status: %d", rw.statusCode)
	}

	err := os.MkdirAll(path.Dir(rw.cachePath), 0777)
	if err != nil {
		return nil, err
	}
	cacheFile, err := os.OpenFile(rw.cachePath, os.O_CREATE|os.O_RDWR, 0644)
	if err != nil {
		return nil, err
	}

	rw.cacheFile = cacheFile

	return cacheFile, nil
}

func (rw *cachedResponseWriter) Close() error {
	if rw.cacheFile != nil {
		return rw.cacheFile.Close()
	}
	return nil
}

func CacheMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(rw http.ResponseWriter, r *http.Request) {
		cachePath := path.Join(config.CachePath, r.URL.Path)
		err := serveFromCache(rw, cachePath)
		if err == nil {
			return
		}
		if !errors.Is(err, os.ErrNotExist) {
			log.Print(err)
			return
		}

		cacheRW := newCachedResponseWriter(rw, cachePath)
		defer cacheRW.Close()

		next.ServeHTTP(cacheRW, r)
	})
}

func serveFromCache(rw http.ResponseWriter, cachePath string) error {

	f, err := os.Open(cachePath)
	if err != nil {
		return err
	}
	defer f.Close()
	rw.Header().Add("Cache-Control", "max-age=3600")
	_, err = io.Copy(rw, f)
	if err != nil {
		return err
	}
	return nil
}
