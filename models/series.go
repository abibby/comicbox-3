package models

import (
	"context"
	"fmt"

	"github.com/abibby/bob"
	"github.com/abibby/bob/hooks"
	"github.com/abibby/bob/selects"
	"github.com/abibby/comicbox-3/server/router"
	"github.com/abibby/nulls"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type Series struct {
	BaseModel
	Name               string                       `json:"name"             db:"name,primary"`
	CoverURL           string                       `json:"cover_url"        db:"-"`
	FirstBookID        *uuid.UUID                   `json:"first_book_id"    db:"first_book_id"`
	FirstBookCoverPage int                          `json:"-"                db:"first_book_cover_page"`
	AnilistId          *nulls.Int                   `json:"anilist_id"       db:"anilist_id"`
	UserSeries         *selects.HasOne[*UserSeries] `json:"user_series"      db:"-" local:"name" foreign:"series_name"`
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

func (s *Series) BeforeSave(ctx context.Context, tx *sqlx.Tx) error {
	b, err := BookQuery(ctx).
		Where("series", "=", s.Name).
		OrderBy("sort").
		Limit(1).
		First(tx)
	if err != nil {
		return err
	}

	if b != nil {
		s.FirstBookID = &b.ID
		s.FirstBookCoverPage = b.CoverPage()
	} else {
		s.FirstBookID = nil
		s.FirstBookCoverPage = 0
	}
	return nil
}

func (s *Series) AfterLoad(ctx context.Context, tx *sqlx.Tx) error {
	if s.FirstBookID != nil {
		s.CoverURL = router.MustURL("book.thumbnail", "id", s.FirstBookID.String(), "page", fmt.Sprint(s.FirstBookCoverPage))
	}
	return nil
}
