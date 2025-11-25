package models

import (
	"context"

	"github.com/abibby/comicbox-3/app/providers"
	"github.com/abibby/salusa/database/builder"
	"github.com/abibby/salusa/database/model"
	"github.com/abibby/salusa/database/model/modeldi"
)

//go:generate spice generate:migration
type Settings struct {
	model.BaseModel

	Key   string `json:"id"    db:"id,primary"`
	Value string `json:"value" db:"value"`
}

func init() {
	providers.Add(modeldi.Register[*Settings])
}

func SettingsQuery(ctx context.Context) *builder.ModelBuilder[*Settings] {
	return builder.From[*Settings]().WithContext(ctx)
}
