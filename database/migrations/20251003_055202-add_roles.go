package migrations

import (
	"context"

	"abibby.com/salusa/database"
	"abibby.com/salusa/database/jsoncolumn"
	"abibby.com/salusa/database/migrate"
	"abibby.com/salusa/database/model"
	"abibby.com/salusa/database/schema"
	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/server/auth"
)

func init() {
	migrations.Add(&migrate.Migration{
		Name: "20251003_055210-add_roles",
		Up: schema.Run(func(ctx context.Context, tx database.DB) error {
			roles := []*models.Role{
				{
					ID:     models.RoleAdminID,
					Name:   "Admin",
					Scopes: jsoncolumn.Slice[auth.TokenScope]{"admin"},
				},
				{
					ID:   models.RoleReaderID,
					Name: "Reader",
					Scopes: jsoncolumn.Slice[auth.TokenScope]{
						"book:index", "book:read",
						"series:index", "series:read",
						"userbook:write",
						"userseries:write",
					},
				},
				{
					ID:   models.RoleEditorID,
					Name: "Editor",
					Scopes: jsoncolumn.Slice[auth.TokenScope]{
						"book:index", "book:read", "book:write",
						"series:index", "series:read", "series:write",
						"userbook:write",
						"userseries:write",
					},
				},
			}
			for _, r := range roles {
				err := model.SaveContext(ctx, tx, r)
				if err != nil {
					return err
				}
			}
			return nil
		}),
		Down: schema.Run(func(ctx context.Context, tx database.DB) error {
			return nil
		}),
	})
}
