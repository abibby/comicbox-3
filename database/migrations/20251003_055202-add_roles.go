package migrations

import (
	"context"

	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/server/auth"
	"github.com/abibby/salusa/database"
	"github.com/abibby/salusa/database/jsoncolumn"
	"github.com/abibby/salusa/database/migrate"
	"github.com/abibby/salusa/database/model"
	"github.com/abibby/salusa/database/schema"
)

func init() {
	migrations.Add(&migrate.Migration{
		Name: "20251003_055210-add_roles",
		Up: schema.Run(func(ctx context.Context, tx database.DB) error {
			roles := []*models.Role{
				{
					ID:     1,
					Name:   "Admin",
					Scopes: jsoncolumn.Slice[auth.TokenScope]{"admin"},
				},
				{
					ID:   2,
					Name: "Reader",
					Scopes: jsoncolumn.Slice[auth.TokenScope]{
						"book:index", "book:read",
						"series:index", "series:read",
						"userbook:write",
						"userseries:write",
					},
				},
				{
					ID:   3,
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
