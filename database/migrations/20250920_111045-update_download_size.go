package migrations

import (
	"context"
	"fmt"

	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/salusa/database"
	"github.com/abibby/salusa/database/migrate"
	"github.com/abibby/salusa/database/model"
	"github.com/abibby/salusa/database/schema"
)

func init() {
	migrations.Add(&migrate.Migration{
		Name: "20250920_111045-update_download_size",
		Up: schema.Run(func(ctx context.Context, tx database.DB) error {
			books, err := models.BookQuery(ctx).Where("download_size", "=", 0).Get(tx)
			if err != nil {
				return err
			}
			total := len(books)
			current := 0
			for _, book := range books {
				if current%1000 == 0 {
					fmt.Printf("%d / %d %f%%\n", current, total, float64(current)/float64(total)*100)
				}
				current++
				err = model.SaveContext(ctx, tx, book)
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
