package models

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"time"

	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/nulls"
	"github.com/davecgh/go-spew/spew"
	"github.com/doug-martin/goqu/v9"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/pkg/errors"
)

type Page struct {
	URL        string `json:"url"`
	FileNumber int    `json:"file"`
	Type       string `json:"type"`
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
	Pages      []*Page        `json:"pages"      db:"-"`
	RawPages   []byte         `json:"-"          db:"pages"`
	Sort       string         `json:"sort"       db:"sort"`
	File       string         `json:"-"          db:"file"`
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

func (b *Book) Insert(tx *sqlx.Tx) error {
	err := b.PrepareForDatabase()
	if err != nil {
		return errors.Wrap(err, "failed to prepare book for database")
	}

	insertSQL, args, err := goqu.Insert("books").Rows(b).ToSQL()
	if err != nil {
		return errors.Wrap(err, "failed to generate insert sql")
	}

	s := &Series{}
	err = tx.Get(s, "select * from series where name = ?", b.Series)
	if err == sql.ErrNoRows {
		err = createSeriesFromBook(tx, b)
		if err != nil {
			return errors.Wrap(err, "failed to create series from book")
		}
	} else if err != nil {
		return errors.Wrap(err, "failed to select series")
	}
	_, err = tx.Query(insertSQL, args...)
	if err != nil {
		print(insertSQL)
		os.Exit(1)
		return errors.Wrap(err, "failed to insert book")
	}
	return nil
}

func createSeriesFromBook(tx *sqlx.Tx, book *Book) error {
	insertSQL, args, err := goqu.Insert("series").Rows(&Series{
		Name:      book.Series,
		CreatedAt: database.Time(time.Now()),
		UpdatedAt: database.Time(time.Now()),
	}).ToSQL()
	if err != nil {
		return err
	}
	_, err = tx.Query(insertSQL, args...)
	return err
}
