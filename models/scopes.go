package models

import (
	"github.com/abibby/comicbox-3/server/auth"
	"github.com/abibby/salusa/database/builder"
)

var UserScoped = &builder.Scope{
	Name: "user-scoped",
	Apply: func(b *builder.SubBuilder) *builder.SubBuilder {
		uid, ok := auth.UserID(b.Context())
		if !ok {
			return b.WhereRaw("1=0")
		}

		return b.Where("user_id", "=", uid)
	},
}
