package models

import (
	"context"

	"github.com/abibby/salusa/database/builder"
	"github.com/abibby/salusa/database/model"
)

//go:generate spice generate:migration
type Permission struct {
	model.BaseModel

	RoleID int    `json:"role_id" db:"role_id,primary"`
	Name   string `json:"name"    db:"name,primary"`
}

func PermissionQuery(ctx context.Context) *builder.Builder[*Permission] {
	return builder.From[*Permission]().WithContext(ctx)
}
