package models

import (
	"database/sql"

	"github.com/abibby/nulls"
	"github.com/doug-martin/goqu/v9"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type UserBook struct {
	BaseModel
	BookID      uuid.UUID  `json:"book_id"      db:"book_id"`
	UserID      uuid.UUID  `json:"user_id"      db:"user_id"`
	CurrentPage *nulls.Int `json:"current_page" db:"current_page"`
}

func (ub *UserBook) Model() *BaseModel {
	return &ub.BaseModel
}
func (*UserBook) Table() string {
	return "user_books"
}
func (*UserBook) PrimaryKey() string {
	return "book_id,user_id"
}

func LoadUserModals(tx *sqlx.Tx, books BookList, uid uuid.UUID) error {
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
			if b.ID.String() == ub.BookID.String() {
				b.UserBook = ub
			}
		}
	}

	return nil
}

func uuidEqual(a, b uuid.UUID) bool {
	for i := range a {
		if a[i] != b[i] {
			return false
		}
	}
	return true
}
