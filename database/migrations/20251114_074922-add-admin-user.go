package migrations

import (
	"context"

	"abibby.com/salusa/database"
	"abibby.com/salusa/database/migrate"
	"abibby.com/salusa/database/model"
	"abibby.com/salusa/database/schema"
	"github.com/abibby/comicbox-3/models"
)

func init() {
	migrations.Add(&migrate.Migration{
		Name: "20251114_074922-add-admin-user",
		Up: schema.Run(func(ctx context.Context, tx database.DB) error {
			adminCount, err := models.UserQuery(ctx).Where("role_id", "=", models.RoleAdminID).Count(tx)
			if err != nil {
				return err
			}

			if adminCount > 0 {
				return nil
			}

			return model.SaveContext(ctx, tx, &models.User{
				Username: "admin",
				Password: []byte("admin"),
				RoleID:   models.RoleAdminID,
			})
		}),
		Down: schema.Run(func(ctx context.Context, tx database.DB) error {
			return nil
		}),
	})
}
