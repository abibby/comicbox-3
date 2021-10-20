package models

import (
	"context"
	"database/sql"

	"github.com/abibby/comicbox-3/server/router"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type Series struct {
	BaseModel
	Name        string      `json:"name"          db:"name"`
	CoverURL    string      `json:"cover_url"     db:"-"`
	FirstBookID *uuid.UUID  `json:"first_book_id" db:"first_book_id"`
	UserSeries  *UserSeries `json:"user_series"   db:"-"`
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
	if b != nil {
		s.FirstBookID = &b.ID
	}
	return nil
}

func (s *Series) AfterLoad(ctx context.Context, tx *sqlx.Tx) error {
	if s.FirstBookID != nil {
		s.CoverURL = router.MustURL("book.page", "id", s.FirstBookID.String(), "page", "0")
	}
	return nil
}

func (sl SeriesList) AfterLoad(ctx context.Context, tx *sqlx.Tx) error {
	for _, s := range sl {
		err := s.AfterLoad(ctx, tx)
		if err != nil {
			return err
		}
	}
	if uid, ok := userID(ctx); ok {
		err := LoadUserSeries(tx, sl, uid)
		if err != nil {
			return err
		}
	}
	return nil
}
