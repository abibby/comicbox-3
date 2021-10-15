package models

import (
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
	return "books"
}
func (*UserBook) PrimaryKey() string {
	return "(book_id,user_id)"
}

func LoadUserModals(tx *sqlx.Tx, books BookList) error {
	bookIDs := make([]uuid.UUID, len(books))

	for i, b := range books {
		bookIDs[i] = b.ID
	}

	sql, args, err := goqu.From("user_books").
		Select(&UserBook{}).
		Where(goqu.C("id").In(bookIDs)).
		ToSQL()
	if err != nil {
		return err
	}

	userBooks := []*UserBook{}

	err = tx.Select(&userBooks, sql, args...)
	if err != nil {
		return err
	}

	for _, b := range books {
		for _, ub := range userBooks {
			if b.ID == ub.BookID {
				b.UserBook = ub
			}
		}
	}

	return nil
}
