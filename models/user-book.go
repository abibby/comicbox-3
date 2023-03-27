package models

import (
	"context"

	"github.com/abibby/bob"
	"github.com/abibby/bob/hooks"
	"github.com/abibby/bob/selects"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type UserBook struct {
	BaseModel
	BookID      uuid.UUID `json:"-"            db:"book_id,primary"`
	UserID      uuid.UUID `json:"-"            db:"user_id,primary"`
	CurrentPage int       `json:"current_page" db:"current_page"`
}

var _ hooks.AfterSaver = &UserBook{}

func UserBookQuery() *selects.Builder[*UserBook] {
	return bob.From[*UserBook]()
}

// func LoadUserBooks(tx *sqlx.Tx, books BookList, uid uuid.UUID) error {
// 	bookIDs := make([]uuid.UUID, len(books))
// 	for i, b := range books {
// 		bookIDs[i] = b.ID
// 	}

// 	ubSQL, args, err := goqu.From("user_books").
// 		Select(&UserBook{}).
// 		Where(goqu.C("book_id").In(bookIDs)).
// 		Where(goqu.C("user_id").Eq(uid)).
// 		ToSQL()
// 	if err != nil {
// 		return err
// 	}

// 	userBooks := []*UserBook{}

// 	err = tx.Select(&userBooks, ubSQL, args...)
// 	if err == sql.ErrNoRows {
// 	} else if err != nil {
// 		return err
// 	}

// 	for _, b := range books {
// 		for _, ub := range userBooks {
// 			if uuidEqual(b.ID, ub.BookID) {
// 				b.UserBook = ub
// 			}
// 		}
// 	}

// 	return nil
// }

func (*UserBook) AfterSave(ctx context.Context, tx *sqlx.Tx) error {

	return nil
}
