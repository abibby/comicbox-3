package main

import (
	"context"
	"database/sql"

	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/nulls"
	"github.com/cheggaaa/pb/v3"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type OldUserBook struct {
	UserID       uuid.UUID      `db:"user_id"`
	BookID       uuid.UUID      `db:"book_id"`
	CurrentPage  int            `db:"current_page"`
	LastPageRead int            `db:"last_page_read"`
	Rating       *nulls.Float64 `db:"rating"`
	Change       int            `db:"change"`
}

func migrateUserBook(ctx context.Context, db *sqlx.DB) {
	total := 0
	limit := 100

	err := db.Get(&total, "select count(*) from user_book")
	check(err)

	bar := pb.StartNew(total)

	for offset := 0; offset < total; offset += limit {
		userBooks := []*OldUserBook{}
		err = db.Select(&userBooks, "select * from user_book limit ? offset ?", limit, offset)
		if err == sql.ErrNoRows {
			return
		}
		check(err)
		err = database.UpdateTx(ctx, func(tx *sqlx.Tx) error {
			for _, u := range userBooks {
				newUser := createUserBook(u)
				err = models.Save(ctx, newUser, tx)
				check(err)
			}
			return nil
		})
		check(err)

		bar.SetCurrent(int64(offset))
	}

	bar.Finish()
}

func createUserBook(oldUserBook *OldUserBook) *models.UserBook {
	return &models.UserBook{
		BookID:      oldUserBook.BookID,
		UserID:      oldUserBook.UserID,
		CurrentPage: oldUserBook.CurrentPage,
	}
}
