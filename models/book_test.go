package models_test

import (
	"context"
	"testing"

	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/test"
	"github.com/abibby/salusa/database/model"
	"github.com/jmoiron/sqlx"
)

func TestBook_save(t *testing.T) {
	test.Run(t, "save", func(ctx context.Context, t *testing.T, tx *sqlx.Tx) {
		model.MustSave(tx, &models.Book{})

	})
}
