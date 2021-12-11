package main

import (
	"context"
	"database/sql"
	"time"

	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/models"
	"github.com/cheggaaa/pb/v3"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type OldUser struct {
	ID           uuid.UUID `db:"id"`
	CreatedAt    time.Time `db:"created_at"`
	UpdatedAt    time.Time `db:"updated_at"`
	Name         string    `db:"name"`
	Username     string    `db:"username"`
	Password     string    `db:"password"`
	Change       int       `db:"change"`
	AnilistToken *string   `db:"anilist_token"`
}

func migrateUsers(ctx context.Context, db *sqlx.DB) {
	total := 0
	limit := 100

	err := db.Get(&total, "select count(*) from user")
	check(err)

	bar := pb.StartNew(total)

	for offset := 0; offset < total; offset += limit {
		users := []*OldUser{}
		err = db.Select(&users, "select * from user limit ? offset ?", limit, offset)
		if err == sql.ErrNoRows {
			return
		}
		check(err)
		err = database.UpdateTx(ctx, func(tx *sqlx.Tx) error {
			for _, u := range users {
				newUser := createUser(u)
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

func createUser(oldUser *OldUser) *models.User {
	return &models.User{
		ID:       oldUser.ID,
		Username: oldUser.Username,
		Password: []byte("test"),
	}
}
