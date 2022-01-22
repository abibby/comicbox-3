package main

import (
	"context"
	"database/sql"
	"encoding/json"
	"time"

	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/nulls"
	"github.com/cheggaaa/pb/v3"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

// Book is a comic chapter or volume in the database
type OldBook struct {
	ID               uuid.UUID      `db:"id"`
	CreatedAt        time.Time      `db:"created_at"`
	UpdatedAt        time.Time      `db:"updated_at"`
	Series           string         `db:"series"`
	Summary          string         `db:"summary"`
	StoryArc         string         `db:"story_arc"`
	AuthorsJSON      []byte         `db:"authors"`
	Authors          []string       `db:"-"`
	Web              string         `db:"web"`
	GenresJSON       []byte         `db:"genres"`
	Genres           []string       `db:"-"`
	AlternateSeries  string         `db:"alternate_series"`
	ReadingDirection string         `db:"reading_direction"`
	MediaType        string         `db:"type"`
	File             string         `db:"file"`
	Title            string         `db:"title"`
	Volume           *int32         `db:"volume"`
	CommunityRating  *nulls.Float64 `db:"community_rating"`
	Chapter          *nulls.Float64 `db:"chapter"`
	DateReleased     *time.Time     `db:"date_released"`
	PagesJSON        []byte         `db:"pages"`
	PageCount        int            `db:"page_count"`
	Pages            []*OldPage     `db:"-"`
	DeletedAt        *time.Time     `db:"deleted_at"`

	Change int `db:"change"`
}

type OldPage struct {
	FileNumber int32  `json:"file_number"`
	Type       string `json:"type"`
	URL        string `json:"url"`
}

func migrateBooks(ctx context.Context, db *sqlx.DB) {
	total := 0
	limit := 100

	err := db.Get(&total, "select count(*) from book")
	check(err)

	bar := pb.StartNew(total)

	for offset := 0; offset < total; offset += limit {
		books := []*OldBook{}
		err = db.Select(&books, "select * from book limit ? offset ?", limit, offset)
		if err == sql.ErrNoRows {
			return
		}
		check(err)
		err = database.UpdateTx(ctx, func(tx *sqlx.Tx) error {
			for _, b := range books {
				newBook := createBook(b)
				err = models.Save(ctx, newBook, tx)
				check(err)
			}
			return nil
		})
		check(err)

		bar.SetCurrent(int64(offset))
	}

	bar.Finish()
}

func createBook(oldBook *OldBook) *models.Book {
	var volume *nulls.Float64
	authors := []string{}
	oldPages := []*OldPage{}

	if oldBook.Volume != nil {
		volume = nulls.NewFloat64(float64(*oldBook.Volume))
	}

	err := json.Unmarshal(oldBook.AuthorsJSON, &authors)
	if err != nil {
		authors = []string{}
	}

	err = json.Unmarshal(oldBook.PagesJSON, &oldPages)
	check(err)
	pages := make([]*models.Page, len(oldPages))
	for i, p := range oldPages {
		pages[i] = &models.Page{
			Type: models.PageType(p.Type),
		}
	}

	book := &models.Book{
		ID:          oldBook.ID,
		Title:       oldBook.Title,
		Chapter:     oldBook.Chapter,
		Volume:      volume,
		Series:      oldBook.Series,
		Authors:     authors,
		Pages:       pages,
		RightToLeft: true,
		File:        oldBook.File,
		// File:        strings.ReplaceAll(oldBook.File, "/comics/", "/mnt/volume1/Public/Comics/"),
	}

	return book
}
