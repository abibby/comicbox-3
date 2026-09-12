package models

import (
	"abibby.com/salusa/database/builder"
	"github.com/abibby/comicbox-3/server/auth"
)

var UserScoped = &builder.Scope{
	Name: "user-scoped",
	Query: func(b *builder.Builder) *builder.Builder {
		uid, ok := auth.UserID(b.Context())
		if !ok {
			return b.WhereRaw("1=0")
		}

		return b.Where("user_id", "=", uid)
	},
}
