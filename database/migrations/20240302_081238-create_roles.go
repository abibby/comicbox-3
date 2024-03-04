package migrations

import (
	"context"

	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/salusa/database"
	"github.com/abibby/salusa/database/migrate"
	"github.com/abibby/salusa/database/model"
	"github.com/abibby/salusa/database/schema"
)

func init() {
	migrations.Add(&migrate.Migration{
		Name: "20240302_081238-create_roles",
		Up: schema.Run(func(ctx context.Context, tx database.DB) error {
			roles := map[string][]string{
				"admin": {},
				"editor": {
					"series.read", "series.update",
					"book.read", "book.update",
					"userbook.create", "userbook.read", "userbook.update", "userbook.delete",
				},
				"reader": {
					"series.read",
					"book.read",
					"userbook.create", "userbook.read", "userbook.update", "userbook.delete",
					"userseries.create", "userseries.read", "userseries.update", "userseries.delete",
				},
				"guest": {
					"series.read",
					"book.read",
				},
			}
			for name, permissions := range roles {
				r, err := models.RoleQuery(ctx).Where("name", "=", name).First(tx)
				if err != nil {
					return err
				}

				if r == nil {
					r = &models.Role{
						Name: name,
					}
					err = model.Save(tx, r)
					if err != nil {
						return err
					}
				}
				err = r.SetPermissions(ctx, tx, permissions)
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
