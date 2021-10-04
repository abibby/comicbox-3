package models

import (
	"encoding/json"
	"fmt"

	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/nulls"
	"github.com/davecgh/go-spew/spew"
	"github.com/google/uuid"
)

type Page struct {
	URL  string `json:"url"`
	File string `json:"file"`
	Type string `json:"type"`
}

type Book struct {
	ID         uuid.UUID      `json:"id"         db:"id"`
	CreatedAt  database.Time  `json:"created_at" db:"created_at"`
	UpdatedAt  database.Time  `json:"updated_at" db:"updated_at"`
	DeletedAt  *database.Time `json:"deleted_at" db:"deleted_at"`
	Title      string         `json:"title"      db:"title"`
	Chapter    *nulls.Float64 `json:"chapter"    db:"chapter"`
	Volume     *nulls.Float64 `json:"volume"     db:"volume"`
	Series     string         `json:"series"     db:"series"`
	Authors    []string       `json:"authors"    db:"-"`
	RawAuthors []byte         `json:"-"          db:"authors"`
	Pages      []Page         `json:"pages"      db:"-"`
	RawPages   []byte         `json:"-"          db:"pages"`
	Sort       string         `json:"sort"       db:"sort"`
}

type BookList []Book

func (b *Book) PrepareForDatabase() error {
	err := marshal(&b.RawAuthors, b.Authors)
	if err != nil {
		return err
	}

	err = marshal(&b.RawPages, b.Pages)
	if err != nil {
		return err
	}

	volume := float64(999_999_999.999)
	if !b.Volume.IsNull() {
		volume = b.Volume.Float64()
	}

	b.Sort = fmt.Sprintf(
		"%s|%013.3f|%013.3f|%s",
		b.Series,
		volume,
		b.Chapter.Float64(),
		b.Title,
	)

	return nil
}

func (b *Book) PrepareForDisplay() error {
	err := json.Unmarshal(b.RawAuthors, &b.Authors)
	if err != nil {
		return err
	}
	err = json.Unmarshal(b.RawPages, &b.Pages)
	if err != nil {
		return err
	}

	spew.Dump(b.Authors == nil)
	return nil
}

func (bl BookList) PrepareForDatabase() error {
	for _, b := range bl {
		err := b.PrepareForDatabase()
		if err != nil {
			return err
		}
	}
	return nil
}

func (bl BookList) PrepareForDisplay() error {
	for _, b := range bl {
		err := b.PrepareForDisplay()
		if err != nil {
			return err
		}
	}
	return nil
}
