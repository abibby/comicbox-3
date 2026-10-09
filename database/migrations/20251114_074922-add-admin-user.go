package migrations

import (
	"context"

	"github.com/abibby/comicbox-3/models"
	"gosalusa.com/database"
	"gosalusa.com/database/migrate"
	"gosalusa.com/database/model"
	"gosalusa.com/database/schema"
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
