package models

import (
	"context"
	"strings"

	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/nulls"
	salusadb "github.com/abibby/salusa/database"
	"github.com/abibby/salusa/database/builder"
	"github.com/abibby/salusa/database/hooks"
	"github.com/google/uuid"
	"github.com/pkg/errors"
	"golang.org/x/crypto/bcrypt"
)

//go:generate spice generate:migration
type User struct {
	BaseModel
	ID               uuid.UUID      `json:"id"       db:"id,primary"`
	Username         string         `json:"username" db:"username"`
	Password         []byte         `json:"-"        db:"-"`
	PasswordHash     []byte         `json:"-"        db:"password"`
	AnilistGrant     *nulls.String  `json:"-"        db:"anilist_grant"`
	AnilistToken     *nulls.String  `json:"-"        db:"anilist_token"`
	AnilistExpiresAt *database.Time `json:"-"        db:"anilist_expires_at"`
	// RoleID           *nulls.Int     `json:"-"        db:"role_id"`

	// Role *builder.BelongsTo[*Role] `json:"role"`
}

var _ hooks.BeforeSaver = &User{}

type UserList []*User

func UserQuery(ctx context.Context) *builder.ModelBuilder[*User] {
	return builder.From[*User]().WithContext(ctx)
}

func (u *User) BeforeSave(ctx context.Context, tx salusadb.DB) error {
	if u.Password != nil {
		hash, err := bcrypt.GenerateFromPassword(u.Password, bcrypt.DefaultCost)
		if err != nil {
			return errors.Wrap(err, "could not hash password")
		}
		u.PasswordHash = hash
	}

	u.Username = strings.ToLower(u.Username)

	return nil
}
