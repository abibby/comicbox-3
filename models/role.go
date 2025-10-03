package models

import (
	"context"

	"github.com/abibby/comicbox-3/app/providers"
	"github.com/abibby/comicbox-3/server/auth"
	"github.com/abibby/salusa/database/builder"
	"github.com/abibby/salusa/database/jsoncolumn"
	"github.com/abibby/salusa/database/model"
	"github.com/abibby/salusa/database/model/modeldi"
)

//go:generate spice generate:migration
type Role struct {
	model.BaseModel

	ID     int                               `json:"-"      db:"id,primary,autoincrement"`
	Name   string                            `json:"name"   db:"name"`
	Scopes jsoncolumn.Slice[auth.TokenScope] `json:"scopes" db:"scopes"`
}

func init() {
	providers.Add(modeldi.Register[*Role])
}

func RoleQuery(ctx context.Context) *builder.ModelBuilder[*Role] {
	return builder.From[*Role]().WithContext(ctx)
}
