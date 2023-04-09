package models

import (
	"github.com/abibby/bob"
	"github.com/abibby/bob/selects"
	"github.com/abibby/comicbox-3/server/auth"
)

var UserScoped = &bob.Scope{
	Name: "user-scoped",
	Apply: func(b *selects.SubBuilder) *selects.SubBuilder {
		uid, ok := auth.UserID(b.Context())
		if !ok {
			return b.WhereRaw("1=0")
		}

		return b.Where("user_id", "=", uid).Dump()
	},
}
