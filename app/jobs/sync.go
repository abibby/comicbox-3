package jobs

import (
	"archive/zip"
	"context"
	"encoding/json"
	"fmt"
	"image"
	"io"
	"io/fs"
	"log"
	"os"
	"path/filepath"
	"regexp"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/abibby/comicbox-3/app/events"
	"github.com/abibby/comicbox-3/config"
	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/nulls"
	"github.com/abibby/salusa/database/model"
	"github.com/abibby/salusa/event"
	"github.com/facebookgo/symwalk"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/pkg/errors"
)

var syncMtx = &sync.Mutex{}

type SyncHandler struct {
	seriesCache map[string]*models.Series
}

var _ event.Handler[*events.SyncEvent] = (*SyncHandler)(nil)

func (h *SyncHandler) Handle(ctx context.Context, event *events.SyncEvent) error {
	syncMtx.Lock()
	defer syncMtx.Unlock()

	h.seriesCache = map[string]*models.Series{}

	log.Print("Starting sync")

	bookFiles, err := getBookFiles(ctx, config.LibraryPath)
	if err != nil {
		return errors.Wrap(err, "failed to fetch book files from disk")
	}

	dbBookFiles := []string{}
	err = database.ReadTx(ctx, func(tx *sqlx.Tx) error {
		err = models.BookQuery(ctx).Select("file").Load(tx, &dbBookFiles)
		if err != nil {
			return errors.Wrap(err, "failed to fetch book files from database")
		}
		return nil
	})
	if err != nil {
		return err
	}

	for _, file := range dbBookFiles {
		if _, ok := bookFiles[file]; ok {
			delete(bookFiles, file)
		} else {
			err = database.UpdateTx(ctx, func(tx *sqlx.Tx) error {
				return removeBook(ctx, tx, file)
			})
			if err != nil {
				log.Printf("Failed to remove %s from the library: %v", file, err)
			} else {
				log.Printf("Removed %s from the library", file)
			}
		}
	}

	count := 0
	for file := range bookFiles {
		count++
		err = database.UpdateTx(ctx, func(tx *sqlx.Tx) error {
			return h.addBook(ctx, tx, file)
		})
		if err != nil {
			log.Printf("failed to add %s to the library: %v", file, err)
		} else {
			log.Printf("Added %s to the library (%d of %d)", file, count, len(bookFiles))
		}
	}

	log.Print("Finished sync")
	return nil
}

func (h *SyncHandler) createSeries(ctx context.Context, tx *sqlx.Tx, name string, book *models.Book) (*models.Series, error) {
	series, ok := h.seriesCache[name]

	if !ok {
		var err error
		series, err = models.SeriesQuery(ctx).Where("name", "=", book.SeriesSlug).First(tx)
		if err != nil {
			return nil, err
		}

		if series == nil {
			series = &models.Series{
				FirstBookCoverPage: book.CoverPage(),
				FirstBookID:        uuid.NullUUID{UUID: book.ID, Valid: true},
				Slug:               book.SeriesSlug,
				Name:               name,
			}

			err = model.SaveContext(ctx, tx, series)
			if err != nil {
				return nil, err
			}
		}
		h.seriesCache[name] = series
	}

	return series, nil
}

func getBookFiles(ctx context.Context, path string) (map[string]struct{}, error) {
	bookFiles := map[string]struct{}{}

	err := symwalk.Walk(path, func(path string, info fs.FileInfo, err error) error {
		if err != nil {
			return err
		}
		if ctx.Err() != nil {
			return ctx.Err()
		}

		if filepath.Ext(path) == ".cbz" {
			bookFiles[path] = struct{}{}
		}

		return nil
	})
	if err != nil {
		return nil, err
	}
	return bookFiles, nil
}

func (h *SyncHandler) addBook(ctx context.Context, tx *sqlx.Tx, file string) error {
	book, err := h.loadBookData(file)
	if errors.Is(err, zip.ErrFormat) {
		return nil
	} else if err != nil {
		return errors.Wrap(err, "failed to load book data from file")
	}
	book.ID = uuid.New()

	seriesName := book.SeriesSlug
	book.SeriesSlug = models.Slug(book.SeriesSlug)

	err = model.SaveContext(ctx, tx, book)
	if err != nil {
		return err
	}

	_, err = h.createSeries(ctx, tx, seriesName, book)
	if err != nil {
		return fmt.Errorf("could not create series: %w", err)
	}

	return nil
}

func (h *SyncHandler) loadBookData(file string) (*models.Book, error) {
	book := &models.Book{}

	reader, err := zip.OpenReader(file)
	if err != nil {
		return nil, errors.Wrap(err, "could not open zip file")
	}

	imgs, err := models.ZippedImages(reader)
	if err != nil {
		return nil, errors.Wrap(err, "could not list page images from zip file")
	}

	book.Pages = make([]*models.Page, len(imgs))
	for i, img := range imgs {
		p, err := buildPage(img, i)
		if err != nil {
			return nil, err
		}
		book.Pages[i] = p
	}

	parseFileName(book, file)

	f, err := reader.Open("book.json")
	if err == nil {
		err = parseBookJSON(book, f)
		if err != nil {
			return nil, errors.Wrap(err, "could not parse book.json")
		}
	} else if !errors.Is(err, os.ErrNotExist) {
		return nil, err
	}

	book.File = file
	return book, nil
}

func buildPage(img *zip.File, pageNumber int) (*models.Page, error) {

	f, err := img.Open()
	if err != nil {
		return nil, err
	}
	defer f.Close()

	cfg, _, err := image.DecodeConfig(f)
	if err != nil {
		return nil, err
	}

	typ := models.PageTypeStory
	if pageNumber == 0 {
		typ = models.PageTypeFrontCover
	} else {
		if cfg.Height < cfg.Width {
			typ = models.PageTypeSpread
		}
	}

	return &models.Page{
		BasePage: models.BasePage{
			Type:   typ,
			Width:  cfg.Width,
			Height: cfg.Height,
		},
	}, nil
}

func parseFileName(book *models.Book, path string) {
	extension := filepath.Ext(path)
	name := filepath.Base(path[:len(path)-len(extension)])
	dir := filepath.Base(filepath.Dir(path))

	book.SeriesSlug = dir

	name = strings.TrimPrefix(name, dir)
	exp := regexp.MustCompile(`^([vV](?P<volume>[\d]+))? *(#?(?P<chapter>[\d]+(\.[\d]+)?))? *(-)? *(?P<title>.*)$`)
	matches := exp.FindStringSubmatch(strings.TrimSpace(strings.Replace(name, "_", " ", -1)))

	result := make(map[string]string)
	for i, name := range exp.SubexpNames() {
		if i != 0 && name != "" {
			result[name] = matches[i]
		}
	}

	chapter, err := strconv.ParseFloat(result["chapter"], 64)
	if err == nil {
		book.Chapter = nulls.NewFloat64(chapter)
	}
	volume, err := strconv.ParseFloat(result["volume"], 64)
	if err == nil {
		book.Volume = nulls.NewFloat64(volume)
	}
	if result["title"] != "" {
		book.Title = result["title"]
	}
}

func parseBookJSON(book *models.Book, f fs.File) error {
	type comboBook struct {
		*models.Book
		Series string         `json:"series"`
		Author string         `json:"author"`
		Number *nulls.Float64 `json:"number"`
	}

	b, err := fileBytes(f)
	if err != nil {
		return err
	}

	tmpBook := comboBook{Book: book}
	err = json.Unmarshal(b, &tmpBook)
	if err != nil {
		return fmt.Errorf("parsing book.json: %v", err)
	}

	if tmpBook.Author != "" {
		tmpBook.Authors = []string{tmpBook.Author}
	}

	if tmpBook.Number != nil {
		tmpBook.Chapter = tmpBook.Number
	}

	tmpBook.File = ""
	return nil
}

func fileBytes(f fs.File) ([]byte, error) {
	b, err := io.ReadAll(f)
	if err != nil {
		return nil, err
	}
	return b, nil
}

func removeBook(ctx context.Context, tx *sqlx.Tx, file string) error {
	now := database.Time(time.Now())
	_, err := tx.QueryContext(ctx, "update books set deleted_at = ?, updated_at = ? where file = ?", now, now, file)
	if err != nil {
		return errors.Wrapf(err, "failed to remove book with file %s", file)
	}
	return nil
}
