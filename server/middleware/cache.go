package middleware

import (
	"context"
	"errors"
	"fmt"
	"io"
	"log"
	"log/slog"
	"net/http"
	"os"
	"path"

	"github.com/abibby/comicbox-3/config"
	"github.com/abibby/salusa/clog"
	"github.com/abibby/salusa/router"
)

type cachedResponseWriter struct {
	cachePath  string
	cacheFile  *os.File
	statusCode int
	rw         http.ResponseWriter
	logger     *slog.Logger
}

var _ http.ResponseWriter = &cachedResponseWriter{}

func newCachedResponseWriter(ctx context.Context, rw http.ResponseWriter, path string) *cachedResponseWriter {
	return &cachedResponseWriter{
		cachePath:  path,
		statusCode: 200,
		rw:         rw,
		logger:     clog.Use(ctx),
	}
}

func (rw *cachedResponseWriter) Header() http.Header {
	return rw.rw.Header()
}
func (rw *cachedResponseWriter) Write(b []byte) (int, error) {
	_, err := rw.fileWrite(b)
	if err != nil {
		rw.logger.Warn("Could not write to cache file", "err", err, "file", rw.cachePathTmp())
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

func (rw *cachedResponseWriter) cachePathTmp() string {
	return rw.cachePath + ".tmp"
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
	cacheFile, err := os.OpenFile(rw.cachePathTmp(), os.O_CREATE|os.O_RDWR, 0644)
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

	return os.Rename(rw.cachePathTmp(), rw.cachePath)
}

func CacheMiddleware() router.Middleware {
	return router.InlineMiddlewareFunc(func(w http.ResponseWriter, r *http.Request, next http.Handler) {
		cachePath := path.Join(config.CachePath, r.URL.Path)
		err := serveFromCache(w, cachePath)
		if err == nil {
			return
		}
		if !errors.Is(err, os.ErrNotExist) {
			log.Print(err)
			return
		}

		cacheRW := newCachedResponseWriter(r.Context(), w, cachePath)
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
