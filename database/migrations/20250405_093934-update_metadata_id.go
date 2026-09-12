package migrations

import (
	"context"

	"abibby.com/salusa/database"
	"abibby.com/salusa/database/migrate"
	"abibby.com/salusa/database/schema"
)

func init() {
	migrations.Add(&migrate.Migration{
		Name: "20250405_093934-update_metadata_id",
		Up: schema.Run(func(ctx context.Context, tx database.DB) error {
			_, err := tx.ExecContext(ctx, `UPDATE series SET metadata_id = concat('anilist://', anilist_id) WHERE anilist_id is not NULL and anilist_id != -1`)
			return err
		}),
		Down: schema.Run(func(ctx context.Context, tx database.DB) error {
			return nil
		}),
	})
}
