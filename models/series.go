package models

import (
	"github.com/abibby/comicbox-3/database"
)

type Series struct {
	Name      string         `json:"name"       db:"name"`
	CreatedAt database.Time  `json:"created_at" db:"created_at"`
	UpdatedAt database.Time  `json:"updated_at" db:"updated_at"`
	DeletedAt *database.Time `json:"deleted_at" db:"deleted_at"`
}
