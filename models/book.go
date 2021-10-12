package models

import (
	"encoding/json"
	"fmt"

	"github.com/abibby/comicbox-3/server/router"
	"github.com/abibby/nulls"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/pkg/errors"
)

type Page struct {
	URL  string   `json:"url"`
	Type PageType `json:"type"`
}

type PageType string

const (
	FrontCover = PageType("FrontCover")
	Story      = PageType("Story")
	Deleted    = PageType("Deleted")
)

type Book struct {
	BaseModel
	ID         uuid.UUID      `json:"id"         db:"id"`
	Title      string         `json:"title"      db:"title"`
	Chapter    *nulls.Float64 `json:"chapter"    db:"chapter"`
	Volume     *nulls.Float64 `json:"volume"     db:"volume"`
	Series     string         `json:"series"     db:"series"`
	Authors    []string       `json:"authors"    db:"-"`
	RawAuthors []byte         `json:"-"          db:"authors"`
	Pages      []*Page        `json:"pages"      db:"-"`
	RawPages   []byte         `json:"-"          db:"pages"`
	Sort       string         `json:"sort"       db:"sort"`
	File       string         `json:"-"          db:"file"`
	CoverURL   string         `json:"cover_url"  db:"-"`
}

var _ BeforeSaver = &Book{}
var _ AfterSaver = &Book{}
var _ AfterLoader = &Book{}

type BookList []*Book

var _ AfterLoader = BookList{}

func (b *Book) Model() *BaseModel {
	return &b.BaseModel
}
func (*Book) Table() string {
	return "books"
}
func (*Book) PrimaryKey() string {
	return "id"
}

func (b *Book) BeforeSave(tx *sqlx.Tx) error {
	if b.Authors == nil {
		b.Authors = []string{}
	}
	err := marshal(&b.RawAuthors, b.Authors)
	if err != nil {
		return err
	}

	if b.Pages == nil {
		b.Pages = []*Page{}
	}
	for _, page := range b.Pages {
		page.URL = ""
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

func (b *Book) AfterSave(tx *sqlx.Tx) error {
	err := Save(&Series{Name: b.Series}, tx)
	if err != nil {
		return errors.Wrap(err, "failed to create series from book")
	}
	return nil
}

func (b *Book) AfterLoad() error {
	err := json.Unmarshal(b.RawAuthors, &b.Authors)
	if err != nil {
		return err
	}

	err = json.Unmarshal(b.RawPages, &b.Pages)
	if err != nil {
		return err
	}

	for i, page := range b.Pages {
		page.URL = router.MustURL("book.thumbnail", "id", b.ID.String(), "page", fmt.Sprint(i))
		if page.Type == FrontCover && b.CoverURL == "" {
			b.CoverURL = router.MustURL("book.page", "id", b.ID.String(), "page", fmt.Sprint(i))
		}
	}

	b.CoverURL = router.MustURL("book.page", "id", b.ID.String(), "page", "0")
	return nil
}

func (bl BookList) AfterLoad() error {
	for _, b := range bl {
		err := b.AfterLoad()
		if err != nil {
			return err
		}
	}
	return nil
}
