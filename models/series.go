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
	UserSeries         *selects.HasOne[*UserSeries] `json:"user_series"      db:"-"`
}

func SeriesQuery() *selects.Builder[*Series] {
	return bob.From[*Series]()
}

var _ hooks.BeforeSaver = &Series{}
var _ hooks.AfterLoader = &Series{}
var _ Model = &Series{}

// type SeriesList []*Series

// var _ hooks.AfterLoader = SeriesList{}

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
	b, err := BookQuery().
		Where("series", "=", s.Name).
		OrderBy("sort").
		Limit(1).
		FirstContext(ctx, tx)
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

// func (sl SeriesList) AfterLoad(ctx context.Context, tx *sqlx.Tx) error {
// 	if uid, ok := auth.UserID(ctx); ok {
// 		err := LoadUserSeries(tx, sl, uid)
// 		if err != nil {
// 			return err
// 		}
// 	}
// 	return nil
// }
