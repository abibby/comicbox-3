package providers

import (
	"context"
	"io/fs"

	"gosalusa.com/di"
	"gosalusa.com/wfs"
)

func RegisterFileSystems(ctx context.Context, libraryPath, cachePath string) {
	lib := wfs.NewLocalFS(libraryPath)
	cache := wfs.NewLocalFS(cachePath)
	di.Register(ctx, func(ctx context.Context, tag string) (fs.FS, error) {
		switch tag {
		case "", "library":
			return lib, nil
		case "cache":
			return cache, nil
		}
		return nil, di.ErrMissingDependancy
	})
}
