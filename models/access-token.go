package models

import (
	"context"

	"abibby.com/salusa/database/builder"
	"abibby.com/salusa/database/model/modeldi"
	"github.com/abibby/comicbox-3/app/providers"
	"github.com/google/uuid"
)

//go:generate spice generate:migration
type AccessToken struct {
	BaseModel

	ID           uuid.UUID `json:"id"   db:"id,primary"`
	UserID       uuid.UUID `json:"-"    db:"user_id"`
	Name         string    `json:"name" db:"name"`
	OPDSHash     []byte    `json:"-"    db:"opds"`
	KOReaderHash []byte    `json:"-"    db:"koreader"`

	User *builder.BelongsTo[*User] `json:"-"`
}

func init() {
	providers.Add(modeldi.Register[*AccessToken])
}

func (a *AccessToken) Scopes() []*builder.Scope {
	return []*builder.Scope{
		UserScoped,
	}
}

func AccessTokenQuery(ctx context.Context) *builder.ModelBuilder[*AccessToken] {
	return builder.From[*AccessToken]().WithContext(ctx)
}
