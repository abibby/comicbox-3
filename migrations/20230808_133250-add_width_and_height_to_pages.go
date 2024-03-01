package migrations

import (
	"archive/zip"
	"context"
	"image"
	"log"

	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/salusa/database/hooks"
	"github.com/abibby/salusa/database/migrate"
	"github.com/abibby/salusa/database/model"
	"github.com/abibby/salusa/database/schema"
)

func init() {
	migrations.Add(&migrate.Migration{
		Name: "20230808_133250-add_width_and_height_to_pages",
		Up: schema.Run(func(ctx context.Context, tx hooks.DB) error {
			pageSize := 1000
			total := 0
			err := models.BookQuery(ctx).SelectFunction("count", "*").LoadOne(tx, &total)
			if err != nil {
				return err
			}
			for offset := 0; offset < total; offset += pageSize {
				books, err := models.BookQuery(ctx).Limit(pageSize).Offset(offset).Get(tx)
				if err != nil {
					return err
				}
				if len(books) == 0 {
					break
				}

				for _, book := range books {
					reader, err := zip.OpenReader(book.File)
					if err != nil {
						log.Printf("could not open zip file: %v", err)
						continue
					}

					imgs, err := models.ZippedImages(reader)
					if err != nil {
						log.Print(err)
						continue
					}
					for i, p := range book.Pages {
						if i < len(imgs) {
							img := imgs[i]
							f, err := img.Open()
							if err != nil {
								log.Print(err)
								continue
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
					err = model.Save(tx, book)
					if err != nil {
						return err
					}
				}
				log.Printf("%d/%d %.0f%%", offset+pageSize, total, float32(offset+pageSize)/float32(total)*100)
			}
			return nil
		}),
		Down: schema.Run(func(ctx context.Context, tx hooks.DB) error {
			return nil
		}),
	})
}
