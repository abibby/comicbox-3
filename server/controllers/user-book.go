package controllers

import (
	"context"
	"fmt"
	"time"

	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/server/auth"
	"github.com/abibby/salusa/database/model"
	"github.com/abibby/salusa/database/model/mixins"
	"github.com/abibby/salusa/request"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/pkg/errors"
)

type UpdateUserBookRequest struct {
	BookID      string            `path:"id"            validate:"uuid"`
	CurrentPage int               `json:"current_page" validate:"require|min:0" model:"current_page"`
	UpdateMap   map[string]string `json:"update_map"   validate:"require"`

	Ctx context.Context `inject:""`
}

var UserBookUpdate = request.Handler(func(r *UpdateUserBookRequest) (*models.UserBook, error) {
	uid, ok := auth.UserID(r.Ctx)
	if !ok {
		return nil, NewHttpError(401, fmt.Errorf("unautherised"))
	}

	ub := &models.UserBook{}

	err := database.UpdateTx(r.Ctx, func(tx *sqlx.Tx) error {
		var err error
		ub, err = models.UserBookQuery(r.Ctx).
			Where("book_id", "=", r.BookID).
			WithoutGlobalScope(mixins.SoftDeleteScope).
			First(tx)
		if err != nil {
			return errors.Wrap(err, "failed to retrieve user book from the database")
		}
		if ub == nil {
			ub = &models.UserBook{
				UserID: uid,
				BookID: uuid.MustParse(r.BookID),
			}
		}
		if shouldUpdate(ub.UpdateMap, r.UpdateMap, "current_page") {
			ub.CurrentPage = r.CurrentPage

			b, err := models.BookQuery(r.Ctx).With("UserSeries").Find(tx, r.BookID)
			if err != nil {
				return fmt.Errorf("failed to find book: %w", err)
			}

			us, _ := b.UserSeries.Value()
			if us == nil {
				uid, _ := auth.UserID(r.Ctx)
				us = &models.UserSeries{
					UserID:     uid,
					SeriesName: b.SeriesName,
				}
			}
			us.LastReadAt = database.Time(time.Now())
			err = model.SaveContext(r.Ctx, tx, us)
			if err != nil {
				return fmt.Errorf("failed to save user series: %w", err)
			}

		}
		ub.DeletedAt = nil

		err = model.SaveContext(r.Ctx, tx, ub)
		return errors.Wrap(err, "failed to save user book")
	})
	if err != nil {
		return nil, err
	}

	return ub, nil
})
