package migrations

import (
	"context"
	"strings"

	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/server/auth"
	"github.com/abibby/salusa/database"
	"github.com/abibby/salusa/database/migrate"
	"github.com/abibby/salusa/database/model"
	"github.com/abibby/salusa/database/schema"
	"github.com/abibby/salusa/slices"
)

func init() {
	migrations.Add(&migrate.Migration{
		Name: "20251220_061520-add_file_roles",
		Up: schema.Run(func(ctx context.Context, tx database.DB) error {
			roleIDs := []int{models.RoleReaderID, models.RoleEditorID}

			for _, id := range roleIDs {
				role, err := models.RoleQuery(ctx).Find(tx, id)
				if err != nil {
					return err
				}

				role.Scopes = append(role.Scopes, auth.ScopeFileRead, auth.ScopeFileWrite)

				err = model.SaveContext(ctx, tx, role)
				if err != nil {
					return err
				}
			}

			return nil
		}),
		Down: schema.Run(func(ctx context.Context, tx database.DB) error {
			roleIDs := []int{models.RoleReaderID, models.RoleEditorID}

			for _, id := range roleIDs {
				role, err := models.RoleQuery(ctx).Find(tx, id)
				if err != nil {
					return err
				}

				role.Scopes = slices.Filter(role.Scopes, func(scope auth.TokenScope) bool {
					return !strings.HasPrefix(string(scope), "file:")
				})

				err = model.SaveContext(ctx, tx, role)
				if err != nil {
					return err
				}
			}

			return nil
		}),
	})
}
