package models

import (
	"context"
	"database/sql"
	"fmt"

	"github.com/abibby/comicbox-3/server/auth"
	"github.com/abibby/comicbox-3/server/router"
	"github.com/abibby/nulls"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type Series struct {
	BaseModel
	Name               string      `json:"name"          db:"name"`
	CoverURL           string      `json:"cover_url"     db:"-"`
	FirstBookID        *uuid.UUID  `json:"first_book_id" db:"first_book_id"`
	FirstBookCoverPage int         `json:"-"             db:"first_book_cover_page"`
	UserSeries         *UserSeries `json:"user_series"   db:"-"`
	AnilistId          *nulls.Int  `json:"anilist_id"    db:"anilist_id"`
}

var _ BeforeSaver = &Series{}
var _ AfterLoader = &Series{}
var _ Model = &Series{}

type SeriesList []*Series

var _ AfterLoader = SeriesList{}

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
	b := &Book{}
	err := tx.Get(b, "select * from books where series = ? order by sort limit 1", s.Name)
	if err == sql.ErrNoRows {
		s.FirstBookID = nil
	} else if err != nil {
		return err
	}

	err = AfterLoad(b, ctx, tx)
	if err != nil {
		return err
	}

	if b != nil {
		s.FirstBookID = &b.ID
		s.FirstBookCoverPage = b.CoverPage()
	}
	return nil
}

func (s *Series) AfterLoad(ctx context.Context, tx *sqlx.Tx) error {
	if s.FirstBookID != nil {
		s.CoverURL = router.MustURL("book.thumbnail", "id", s.FirstBookID.String(), "page", fmt.Sprint(s.FirstBookCoverPage))
	}
	return nil
}

func (sl SeriesList) AfterLoad(ctx context.Context, tx *sqlx.Tx) error {
	if uid, ok := auth.UserID(ctx); ok {
		err := LoadUserSeries(tx, sl, uid)
		if err != nil {
			return err
		}
	}
	return nil
}
