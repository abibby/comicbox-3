package models

import (
	"github.com/abibby/bob"
	"github.com/abibby/bob/selects"
	"github.com/abibby/comicbox-3/server/auth"
	"github.com/davecgh/go-spew/spew"
)

var UserScoped = &bob.Scope{
	Name: "user-scoped",
	Apply: func(b *selects.SubBuilder) *selects.SubBuilder {
		uid, _ := auth.UserID(b.Context())
		spew.Dump(b.Context())
		// spew.Dump(uid, ok)
		// if !ok {
		// 	return b.WhereRaw("1=0")
		// }

		return b.Where("user_id", "=", uid)
	},
}
