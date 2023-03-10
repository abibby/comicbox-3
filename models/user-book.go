package models

import (
	"context"
	"database/sql"
	"errors"

	"github.com/abibby/comicbox-3/server/auth"
	"github.com/doug-martin/goqu/v9"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type UserBook struct {
	BaseModel
	BookID          uuid.UUID `json:"-"            db:"book_id"`
	UserID          uuid.UUID `json:"-"            db:"user_id"`
	CurrentPage     int       `json:"current_page" db:"current_page"`
	LastCurrentPage int       `json:"-"            db:"-"`
}

var _ AfterLoader = &UserBook{}
var _ AfterSaver = &UserBook{}

func (ub *UserBook) Model() *BaseModel {
	return &ub.BaseModel
}
func (*UserBook) Table() string {
	return "user_books"
}
func (*UserBook) PrimaryKey() string {
	return "book_id,user_id"
}

func LoadUserBooks(tx *sqlx.Tx, books BookList, uid uuid.UUID) error {
	bookIDs := make([]uuid.UUID, len(books))
	for i, b := range books {
		bookIDs[i] = b.ID
	}

	ubSQL, args, err := goqu.From("user_books").
		Select(&UserBook{}).
		Where(goqu.C("book_id").In(bookIDs)).
		Where(goqu.C("user_id").Eq(uid)).
		ToSQL()
	if err != nil {
		return err
	}

	userBooks := []*UserBook{}

	err = tx.Select(&userBooks, ubSQL, args...)
	if err == sql.ErrNoRows {
	} else if err != nil {
		return err
	}

	for _, b := range books {
		for _, ub := range userBooks {
			if uuidEqual(b.ID, ub.BookID) {
				b.UserBook = ub
			}
		}
	}

	return nil
}

func (ub *UserBook) AfterLoad(ctx context.Context, tx *sqlx.Tx) error {
	ub.LastCurrentPage = ub.CurrentPage
	return nil
}

func (ub *UserBook) AfterSave(ctx context.Context, tx *sqlx.Tx) error {
	if ub.LastCurrentPage != ub.CurrentPage {
		uid, ok := auth.UserID(ctx)
		if ok {
			b := &Book{}
			err := Find(ctx, tx, b, ub.BookID.String())
			if err != nil {
				return err
			}

			latestBook := &Book{}
			err = tx.Get(latestBook, `select books.*
				from books
				left join user_books user_books on books.id = user_books.book_id and user_books.user_id = ?
				WHERE
					books.series = ?
					and (user_books.current_page < (books.page_count - 1) or user_books.current_page is null)
					and books.deleted_at is null
				order by sort
				limit 1`, uid, b.Series)
			if errors.Is(err, sql.ErrNoRows) {
			} else if err != nil {
				return err
			}

			err = AfterLoad(latestBook, ctx, tx)
			if err != nil {
				return err
			}
			us := &UserSeries{}
			err = tx.Get(us, "select * from user_series where series_name=? and user_id=?", b.Series, uid)
			if err != nil {
				return err
			}
			err = AfterLoad(us, ctx, tx)
			if err != nil {
				return err
			}

			if latestBook == nil {
				us.LatestBookID = nil
			} else {
				us.LatestBookID = &latestBook.ID
			}

			err = Save(ctx, tx, us)
			if err != nil {
				return err
			}
		}
	}
	ub.LastCurrentPage = ub.CurrentPage
	return nil
}
