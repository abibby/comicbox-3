package models

import (
	"context"
	"fmt"

	"github.com/abibby/bob"
	"github.com/abibby/bob/builder"
	"github.com/abibby/bob/hooks"
	"github.com/abibby/bob/selects"
	"github.com/abibby/comicbox-3/server/router"
	"github.com/abibby/nulls"
	"github.com/google/uuid"
)

//go:generate go run github.com/abibby/bob/bob-cli@latest generate
type Series struct {
	BaseModel
	Name               string                       `json:"name"             db:"name,primary"`
	CoverURL           string                       `json:"cover_url"        db:"-"`
	FirstBookID        *uuid.UUID                   `json:"first_book_id"    db:"first_book_id"`
	FirstBookCoverPage int                          `json:"-"                db:"first_book_cover_page"`
	AnilistId          *nulls.Int                   `json:"anilist_id"       db:"anilist_id"`
	UserSeries         *selects.HasOne[*UserSeries] `json:"user_series"      db:"-" local:"name" foreign:"series_name"`
	LatestBookID       *uuid.UUID                   `json:"latest_book_id"   db:"latest_book_id,readonly"`
	LatestBook         *selects.BelongsTo[*Book]    `json:"latest_book"      db:"-" foreign:"latest_book_id" owner:"id"`
}

func SeriesQuery(ctx context.Context) *selects.Builder[*Series] {
	return bob.From[*Series]().WithContext(ctx)
}

var _ hooks.BeforeSaver = &Series{}
var _ hooks.AfterLoader = &Series{}
var _ bob.Scoper = &Series{}

func (b *Series) Scopes() []*bob.Scope {
	return []*bob.Scope{
		bob.SoftDeletes,
	}
}

func (s *Series) Model() *BaseModel {
	return &s.BaseModel
}
func (*Series) Table() string {
	return "series"
}
func (*Series) PrimaryKey() string {
	return "name"
}

func (s *Series) BeforeSave(ctx context.Context, tx builder.QueryExecer) error {
	err, _ := s.UpdateFirstBook(ctx, tx, nil)
	return err
}

func (s *Series) AfterLoad(ctx context.Context, tx builder.QueryExecer) error {
	if s.FirstBookID != nil {
		s.CoverURL = router.MustURL("book.thumbnail", "id", s.FirstBookID.String(), "page", fmt.Sprint(s.FirstBookCoverPage))
	}
	return nil
}

func (s *Series) UpdateFirstBook(ctx context.Context, tx builder.QueryExecer, newBook *Book) (error, bool) {
	b, err := BookQuery(ctx).
		Where("series", "=", s.Name).
		OrderBy("sort").
		Limit(1).
		First(tx)
	if err != nil {
		return err, false
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
	return nil, s.FirstBookID != oldID || s.FirstBookCoverPage != oldCoverPage
}
