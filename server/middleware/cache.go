package middleware

import (
	"context"
	"errors"
	"fmt"
	"io"
	"io/fs"
	"log/slog"
	"net/http"
	"os"
	"path"

	"gosalusa.com/di"
	"gosalusa.com/router"
	"gosalusa.com/wfs"
)

type cachedResponseWriter struct {
	cachePath  string
	cacheFile  wfs.File
	statusCode int
	rw         http.ResponseWriter
	logger     *slog.Logger
	fsys       fs.FS
}
type deps struct {
	Logger *slog.Logger `inject:""`
	FS     fs.FS        `inject:"cache"`
}

var _ http.ResponseWriter = &cachedResponseWriter{}

func newCachedResponseWriter(ctx context.Context, d *deps, rw http.ResponseWriter, path string) *cachedResponseWriter {
	return &cachedResponseWriter{
		cachePath:  path,
		statusCode: 200,
		rw:         rw,
		logger:     d.Logger,
		fsys:       d.FS,
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
func (rw *cachedResponseWriter) file() (wfs.File, error) {
	if rw.cacheFile != nil {
		return rw.cacheFile, nil
	}

	if rw.statusCode != 200 {
		return nil, fmt.Errorf("non 200 status: %d", rw.statusCode)
	}

	err := wfs.Mkdir(rw.fsys, path.Dir(rw.cachePath))
	if err != nil {
		return nil, err
	}
	cacheFile, err := wfs.OpenFile(rw.fsys, rw.cachePathTmp(), wfs.O_CREATE|wfs.O_RDWR)
	if err != nil {
		return nil, err
	}

	rw.cacheFile = cacheFile

	return cacheFile, nil
}

func (rw *cachedResponseWriter) Close() error {
	var fileCloseErr error
	if rw.cacheFile != nil {
		fileCloseErr = rw.cacheFile.Close()
	}

	return errors.Join(fileCloseErr, wfs.Rename(rw.fsys, rw.cachePathTmp(), rw.cachePath))
}

type cacheMiddleware struct {
	di.Uses[*deps]
}

func CacheMiddleware() router.Middleware {
	return &cacheMiddleware{}
}

// Middleware implements [router.Middleware].
func (c *cacheMiddleware) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		d, err := di.Resolve[*deps](r.Context())
		if err != nil {
			return
		}
		cachePath := r.URL.Path[1:]
		err = serveFromCache(r.Context(), d, w, cachePath)
		if err == nil {
			return
		}
		if !errors.Is(err, os.ErrNotExist) {
			d.Logger.Warn("failed to serve cached response", "path", r.URL, "error", err)
			return
		}

		cacheRW := newCachedResponseWriter(r.Context(), d, w, cachePath)
		defer cacheRW.Close()

		next.ServeHTTP(cacheRW, r)
	})
}

func serveFromCache(ctx context.Context, d *deps, rw http.ResponseWriter, cachePath string) error {
	f, err := d.FS.Open(cachePath)
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
