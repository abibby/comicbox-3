package models

import (
	"context"

	"abibby.com/salusa/database/builder"
	"abibby.com/salusa/database/jsoncolumn"
	"abibby.com/salusa/database/model"
	"abibby.com/salusa/database/model/modeldi"
	"github.com/abibby/comicbox-3/app/providers"
	"github.com/abibby/comicbox-3/server/auth"
)

//go:generate spice generate:migration
type Role struct {
	model.BaseModel

	ID     int                               `json:"id"     db:"id,primary,autoincrement"`
	Name   string                            `json:"name"   db:"name"`
	Scopes jsoncolumn.Slice[auth.TokenScope] `json:"scopes" db:"scopes"`
}

const (
	RoleAdminID  = 1
	RoleReaderID = 2
	RoleEditorID = 3
)

func init() {
	providers.Add(modeldi.Register[*Role])
}

func RoleQuery(ctx context.Context) *builder.ModelBuilder[*Role] {
	return builder.From[*Role]().WithContext(ctx)
}
