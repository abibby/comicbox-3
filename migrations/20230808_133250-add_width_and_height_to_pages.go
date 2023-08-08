package migrations

import (
	"archive/zip"
	"context"
	"fmt"
	"image"
	"log"

	"github.com/abibby/bob"
	"github.com/abibby/bob/builder"
	"github.com/abibby/bob/migrate"
	"github.com/abibby/bob/schema"
	"github.com/abibby/comicbox-3/models"
)

func init() {
	migrations.Add(&migrate.Migration{
		Name: "20230808_133250-add_width_and_height_to_pages",
		Up: schema.Run(func(ctx context.Context, tx builder.QueryExecer) error {
			pageSize := 1000
			total := 0
			err := models.BookQuery(ctx).SelectFunction("count", "*").LoadOne(tx, &total)
			if err != nil {
				return err
			}
			for i := 0; i < total; i += pageSize {
				books, err := models.BookQuery(ctx).Limit(pageSize).Offset(i).Get(tx)
				if err != nil {
					return err
				}
				if len(books) == 0 {
					break
				}

				for _, book := range books {
					reader, err := zip.OpenReader(book.File)
					if err != nil {
						return fmt.Errorf("could not open zip file: %w", err)
					}

					imgs, err := models.ZippedImages(reader)
					if err != nil {
						return err
					}
					for i, p := range book.Pages {
						if i < len(imgs) {
							img := imgs[i]
							f, err := img.Open()
							if err != nil {
								return err
							}
							cfg, _, err := image.DecodeConfig(f)
							if err != nil {
								log.Print(err)
								continue
							}

							p.Height = cfg.Height
							p.Width = cfg.Width
						}
					}
					err = bob.Save(tx, book)
					if err != nil {
						return err
					}
				}
				log.Printf("%d/%d %.0f%%", i+pageSize, total, float32(i+pageSize)/float32(total)*100)
			}
			return nil
		}),
		Down: schema.Run(func(ctx context.Context, tx builder.QueryExecer) error {
			return nil
		}),
	})
}
