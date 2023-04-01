package models

import (
	"github.com/abibby/bob"
	"github.com/abibby/bob/selects"
	"github.com/google/uuid"
)

type UserBook struct {
	BaseModel
	BookID      uuid.UUID `json:"-"            db:"book_id,primary"`
	UserID      uuid.UUID `json:"-"            db:"user_id,primary"`
	CurrentPage int       `json:"current_page" db:"current_page"`
}

func UserBookQuery() *selects.Builder[*UserBook] {
	return bob.From[*UserBook]()
}
