package main

import (
	"context"
	"database/sql"
	"strings"

	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/nulls"
	"github.com/cheggaaa/pb/v3"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type OldUserSeries struct {
	Series string        `db:"series"`
	UserID uuid.UUID     `db:"user_id"`
	List   *nulls.String `db:"list"`
	Tags   string        `db:"tags"`
	Change int           `db:"change"`
}

func migrateUserSeries(ctx context.Context, db *sqlx.DB) {
	total := 0
	limit := 100

	err := db.Get(&total, "select count(*) from user_series")
	check(err)

	bar := pb.StartNew(total)

	for offset := 0; offset < total; offset += limit {
		userSeries := []*OldUserSeries{}
		err = db.Select(&userSeries, "select * from user_series limit ? offset ?", limit, offset)
		if err == sql.ErrNoRows {
			return
		}
		check(err)
		err = database.UpdateTx(ctx, func(tx *sqlx.Tx) error {
			for _, u := range userSeries {
				newUser := createUserSeries(u)
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

func createUserSeries(oldUserSeries *OldUserSeries) *models.UserSeries {
	var listStr *nulls.String
	if oldList, ok := oldUserSeries.List.Ok(); ok {
		listStr = nulls.NewString(strings.ToLower(oldList))
	}

	list := models.ListNone

	if !listStr.IsNull() {
		list = models.List(listStr.String())
	}

	return &models.UserSeries{
		SeriesName: oldUserSeries.Series,
		UserID:     oldUserSeries.UserID,
		List:       list,
	}
}
