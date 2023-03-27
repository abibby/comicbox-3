package models

import (
	"context"

	"github.com/abibby/bob/hooks"
	"github.com/abibby/bob/selects"
	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/nulls"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/pkg/errors"
	"golang.org/x/crypto/bcrypt"
)

type User struct {
	BaseModel
	ID               uuid.UUID      `json:"id"       db:"id,primary"`
	Username         string         `json:"username" db:"username"`
	Password         []byte         `json:"-"        db:"-"`
	PasswordHash     []byte         `json:"-"        db:"password"`
	AnilistGrant     *nulls.String  `json:"-"        db:"anilist_grant"`
	AnilistToken     *nulls.String  `json:"-"        db:"anilist_token"`
	AnilistExpiresAt *database.Time `json:"-"        db:"anilist_expires_at"`
}

var _ hooks.BeforeSaver = &User{}

type UserList []*User

func UserQuery() *selects.Builder[*User] {
	return selects.From[*User]()
}

func (u *User) BeforeSave(ctx context.Context, tx *sqlx.Tx) error {
	if u.Password != nil {
		hash, err := bcrypt.GenerateFromPassword(u.Password, bcrypt.DefaultCost)
		if err != nil {
			return errors.Wrap(err, "could not hash password")
		}
		u.PasswordHash = hash
	}

	return nil
}
