package models

import (
	"context"

	salusadb "github.com/abibby/salusa/database"
	"github.com/abibby/salusa/database/builder"
	"github.com/google/uuid"
)

//go:generate spice generate:migration
type UserBook struct {
	BaseModel
	BookID      uuid.UUID `json:"-"            db:"book_id,primary"`
	UserID      uuid.UUID `json:"-"            db:"user_id,primary"`
	CurrentPage int       `json:"current_page" db:"current_page"`

	Book *builder.BelongsTo[*Book] `json:"-"`
	User *builder.BelongsTo[*User] `json:"-"`
}

func UserBookQuery(ctx context.Context) *builder.ModelBuilder[*UserBook] {
	return builder.From[*UserBook]().WithContext(ctx)
}

var _ builder.Scoper = &UserBook{}

func (b *UserBook) Scopes() []*builder.Scope {
	return []*builder.Scope{
		UserScoped,
	}
}

func (ub *UserBook) AfterSave(ctx context.Context, tx salusadb.DB) error {
	err := builder.LoadMissing(tx, ub, "Book")
	if err != nil {
		return err
	}
	b, _ := ub.Book.Value()
	if b != nil {
		err = UpdateUserSeriesLatestBookID(ctx, tx, []string{b.SeriesSlug})
		if err != nil {
			return err
		}
	}
	return nil
}
