package models

import (
	"context"

	"github.com/abibby/salusa/database/builder"
	"github.com/abibby/salusa/database/model"
)

//go:generate spice generate:migration
type Role struct {
	model.BaseModel

	ID int `json:"id" db:"id,primary,autoincrement"`
}

func RoleQuery(ctx context.Context) *builder.Builder[*Role] {
	return builder.From[*Role]().WithContext(ctx)
}
