package models

import (
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
	"github.com/pkg/errors"
	"golang.org/x/crypto/bcrypt"
)

type User struct {
	BaseModel
	ID           uuid.UUID `json:"id"       db:"id"`
	Username     string    `json:"username" db:"username"`
	Password     []byte    `json:"-"        db:"-"`
	PasswordHash []byte    `json:"-"        db:"password"`
}

var _ Model = &User{}
var _ BeforeSaver = &User{}

type UserList []*User

func (s *User) Model() *BaseModel {
	return &s.BaseModel
}
func (*User) Table() string {
	return "users"
}
func (*User) PrimaryKey() string {
	return "id"
}

func (u *User) BeforeSave(tx *sqlx.Tx) error {
	if u.Password != nil {
		hash, err := bcrypt.GenerateFromPassword(u.Password, bcrypt.DefaultCost)
		if err != nil {
			return errors.Wrap(err, "could not hash password")
		}
		u.PasswordHash = hash
	}

	return nil
}
