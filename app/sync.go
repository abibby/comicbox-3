package app

import (
	"archive/zip"
	"context"
	"encoding/json"
	"fmt"
	"io/fs"
	"io/ioutil"
	"log"
	"path/filepath"
	"regexp"
	"sort"
	"strconv"
	"strings"

	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/nulls"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/pkg/errors"
)

func Sync(ctx context.Context) error {
	log.Print("Starting sync")

	bookFiles, err := getBookFiles(ctx)
	if err != nil {
		return errors.Wrap(err, "failed to fetch book files from disk")
	}

	return database.UpdateTx(ctx, func(tx *sqlx.Tx) error {
		dbBookFiles := []string{}
		err := tx.Select(&dbBookFiles, "select file from books where deleted_at is null")
		if err != nil {
			return errors.Wrap(err, "failed to fetch book files from database")
		}
		for _, file := range dbBookFiles {
			if _, ok := bookFiles[file]; ok {
				delete(bookFiles, file)
			} else {
				log.Printf("Removing %s from the library", file)
			}
		}

		for file := range bookFiles {
			log.Printf("Adding %s to the library", file)
			err = addBook(tx, file)
			if err != nil {
				return err
			}
		}

		return nil
	})

}

func getBookFiles(ctx context.Context) (map[string]struct{}, error) {
	bookFiles := map[string]struct{}{}

	err := filepath.Walk("/home/adam/manga", func(path string, info fs.FileInfo, err error) error {
		if err != nil {
			return err
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

func addBook(tx *sqlx.Tx, file string) error {
	book, err := loadBookData(file)
	if err != nil {
		return errors.Wrap(err, "failed to load book data from file")
	}
	book.ID = uuid.New()

	return book.Insert(tx)
}

func loadBookData(file string) (*models.Book, error) {
	book := &models.Book{}

	reader, err := zip.OpenReader(file)
	if err != nil {
		return nil, errors.Wrap(err, "could not open zip file")
	}

	imgs, err := ZippedImages(reader)
	if err != nil {
		return nil, errors.Wrap(err, "could not list page images from zip file")
	}

	numPages := len(imgs)
	tmpPages := make([]*models.Page, numPages)
	for i := 0; i < numPages; i++ {
		typ := "Story"
		if i == 0 {
			typ = "FrontCover"
		}
		tmpPages[i] = &models.Page{
			FileNumber: i,
			Type:       typ,
		}
	}
	book.Pages = tmpPages

	parseFileName(book, file)
	if err != nil {
		return nil, errors.Wrap(err, "could not parese file name")
	}

	for _, f := range reader.File {
		name := f.FileInfo().Name()
		if name == "book.json" {
			err = parseBookJSON(book, f)
			if err != nil {
				return nil, errors.Wrap(err, "could not parse book.json")
			}
		}
	}
	book.File = file
	return book, nil
}

func ZippedImages(reader *zip.ReadCloser) ([]*zip.File, error) {
	sort.Slice(reader.File, func(i, j int) bool {
		return strings.Compare(reader.File[i].Name, reader.File[j].Name) < 0
	})

	imageFiles := reader.File[:0]
	for _, x := range reader.File {
		lowerName := strings.ToLower(x.Name)
		if strings.HasSuffix(lowerName, ".jpg") ||
			strings.HasSuffix(lowerName, ".jpeg") ||
			strings.HasSuffix(lowerName, ".png") ||
			strings.HasSuffix(lowerName, ".bmp") ||
			strings.HasSuffix(lowerName, ".gif") ||
			strings.HasSuffix(lowerName, ".webp") ||
			strings.HasSuffix(lowerName, ".tiff") {
			imageFiles = append(imageFiles, x)
		}
	}
	return imageFiles, nil
}

func parseFileName(book *models.Book, path string) *models.Book {
	extension := filepath.Ext(path)
	name := filepath.Base(path[:len(path)-len(extension)])
	dir := filepath.Base(filepath.Dir(path))

	book.Series = dir

	if strings.HasPrefix(name, dir) {
		name = name[len(dir):]
	}
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
	volume, err := strconv.ParseFloat(result["chapter"], 64)
	if err == nil {
		book.Volume = nulls.NewFloat64(volume)
	}
	if result["title"] != "" {
		book.Title = result["title"]
	}
	return book
}

func parseBookJSON(book *models.Book, f *zip.File) error {
	type comboBook struct {
		*models.Book
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

	if tmpBook.Pages != nil && len(tmpBook.Pages) > 0 {
		allZero := true
		for _, page := range tmpBook.Pages {
			if page.FileNumber != 0 {
				allZero = false
			}
		}
		if allZero {
			for i := range tmpBook.Pages {
				tmpBook.Pages[i].FileNumber = i
			}
		}
	}
	tmpBook.File = ""
	return nil
}

func fileBytes(f *zip.File) ([]byte, error) {
	reader, err := f.Open()
	if err != nil {
		return nil, err
	}
	defer reader.Close()

	b, err := ioutil.ReadAll(reader)
	if err != nil {
		return nil, err
	}
	return b, nil
}
