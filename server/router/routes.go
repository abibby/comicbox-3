package router

import (
	"context"

	"github.com/abibby/comicbox-3/app/deps"
	"github.com/abibby/salusa/router"
)

func URL(ctx context.Context, name string, pairs ...string) (string, error) {
	var resolver router.URLResolver
	err := deps.Provider.Fill(ctx, &resolver)
	if err != nil {
		return "", err
	}
	params := make([]any, len(pairs))
	for i, pair := range pairs {
		params[i] = pair
	}
	return resolver.Resolve(name, params...), nil
}

func MustURL(ctx context.Context, name string, pairs ...string) string {
	u, err := URL(ctx, name, pairs...)
	if err != nil {
		panic(err)
	}
	return u
}
