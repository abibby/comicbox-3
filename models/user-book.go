package models

import (
	"context"

	"github.com/abibby/bob"
	"github.com/abibby/bob/selects"
	"github.com/google/uuid"
)

//go:generate go run github.com/abibby/bob/bob-cli@latest generate
type UserBook struct {
	BaseModel
	BookID      uuid.UUID `json:"-"            db:"book_id,primary"`
	UserID      uuid.UUID `json:"-"            db:"user_id,primary"`
	CurrentPage int       `json:"current_page" db:"current_page"`
}

func UserBookQuery(ctx context.Context) *selects.Builder[*UserBook] {
	return bob.From[*UserBook]().WithContext(ctx)
}

var _ bob.Scoper = &UserBook{}

func (b *UserBook) Scopes() []*bob.Scope {
	return []*bob.Scope{
		bob.SoftDeletes,
		UserScoped,
	}
}
