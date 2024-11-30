package models

import (
	"bytes"
	"context"
	"fmt"

	"github.com/abibby/comicbox-3/server/router"
	"github.com/abibby/nulls"
	"github.com/abibby/salusa/database"
	"github.com/abibby/salusa/database/builder"
	"github.com/abibby/salusa/database/hooks"
	"github.com/google/uuid"
)

//go:generate spice generate:migration
type Series struct {
	BaseModel
	Slug               string                       `json:"slug"             db:"name,primary"`
	Name               string                       `json:"name"             db:"display_name,primary"`
	CoverURL           string                       `json:"cover_url"        db:"-"`
	FirstBookID        *uuid.UUID                   `json:"first_book_id"    db:"first_book_id"`
	FirstBookCoverPage int                          `json:"-"                db:"first_book_cover_page"`
	AnilistId          *nulls.Int                   `json:"anilist_id"       db:"anilist_id"`
	UserSeries         *builder.HasOne[*UserSeries] `json:"user_series"      db:"-" local:"name" foreign:"series_name"`
	LatestBookID       *uuid.UUID                   `json:"latest_book_id"   db:"latest_book_id,readonly"`
	LatestBook         *builder.BelongsTo[*Book]    `json:"latest_book"      db:"-" foreign:"latest_book_id" owner:"id"`
}

func SeriesQuery(ctx context.Context) *builder.ModelBuilder[*Series] {
	return builder.From[*Series]().WithContext(ctx)
}

var _ hooks.BeforeSaver = &Series{}
var _ hooks.AfterLoader = &Series{}
var _ builder.Scoper = &Series{}

func (*Series) Table() string {
	return "series"
}
func (*Series) PrimaryKey() string {
	return "name"
}

func (s *Series) BeforeSave(ctx context.Context, tx database.DB) error {
	_, err := s.UpdateFirstBook(ctx, tx, nil)
	return err
}

func (s *Series) AfterLoad(ctx context.Context, tx database.DB) error {
	if s.FirstBookID != nil {
		s.CoverURL = router.MustURL(ctx, "book.thumbnail", "id", s.FirstBookID.String(), "page", fmt.Sprint(s.FirstBookCoverPage))
	}
	return nil
}

func (s *Series) UpdateFirstBook(ctx context.Context, tx database.DB, newBook *Book) (bool, error) {
	b, err := BookQuery(ctx).
		Where("series", "=", s.Slug).
		OrderBy("sort").
		Limit(1).
		First(tx)
	if err != nil {
		return false, err
	}

	if b == nil {
		b = newBook
	}
	if newBook != nil {
		if b.Sort > newBook.Sort {
			b = newBook
		}
	}
	oldID := s.FirstBookID
	oldCoverPage := s.FirstBookCoverPage
	if b != nil {
		s.FirstBookID = &b.ID
		s.FirstBookCoverPage = b.CoverPage()
	} else {
		s.FirstBookID = nil
		s.FirstBookCoverPage = 0
	}
	return s.FirstBookID != oldID || s.FirstBookCoverPage != oldCoverPage, nil
}

func Slug(s string) string {
	capOffset := byte('a' - 'A')
	out := make([]byte, 0, len(s))
	lastC := byte(0)
	for _, c := range []byte(s) {
		var newC byte
		if 'a' <= c && c <= 'z' {
			newC = c
		} else if 'A' <= c && c <= 'Z' {
			newC = c + capOffset
		} else {
			newC = '-'
		}
		if newC == '-' && lastC == '-' {
			continue
		}
		out = append(out, newC)
		lastC = newC
	}
	return string(bytes.Trim(out, "-"))
}
