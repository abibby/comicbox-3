package models

import (
	"context"

	"github.com/abibby/salusa/database"
	"github.com/abibby/salusa/database/builder"
	"github.com/abibby/salusa/database/model"
)

//go:generate spice generate:migration
type Role struct {
	model.BaseModel

	ID   int    `json:"id" db:"id,primary,autoincrement"`
	Name string `json:"name" db:"name"`

	Permissions *builder.HasMany[*Permission] `json:"permission"`
}

func RoleQuery(ctx context.Context) *builder.Builder[*Role] {
	return builder.From[*Role]().WithContext(ctx)
}

func (r *Role) SetPermissions(ctx context.Context, tx database.DB, perms []string) error {
	// I think Permissions is null when it should have been set by mode.Save
	err := r.Permissions.Subquery().Delete(tx)
	if err != nil {
		return err
	}
	for _, name := range perms {
		err = model.Save(tx, &Permission{
			RoleID: r.ID,
			Name:   name,
		})
		if err != nil {
			return err
		}
	}
	return nil
}
