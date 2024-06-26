package models

import (
	"context"

	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/salusa/database/builder"
	"github.com/google/uuid"
)

//go:generate spice generate:migration
type UserSeries struct {
	BaseModel
	SeriesName string        `json:"-"            db:"series_name,primary"`
	UserID     uuid.UUID     `json:"-"            db:"user_id,primary"`
	List       List          `json:"list"         db:"list"`
	LastReadAt database.Time `json:"last_read_at" db:"last_read_at"`

	Series *builder.BelongsTo[*Series] `json:"-" foreign:"series_name" owner:"name"`
	User   *builder.BelongsTo[*User]   `json:"-"`
}

type List string

func (l List) Options() map[string]string {
	return map[string]string{
		"None":      string(ListNone),
		"Reading":   string(ListReading),
		"Dropped":   string(ListDropped),
		"Completed": string(ListCompleted),
		"Paused":    string(ListPaused),
		"Planning":  string(ListPlanning),
	}
}

const (
	ListNone      = List("")
	ListReading   = List("reading")
	ListDropped   = List("dropped")
	ListCompleted = List("completed")
	ListPaused    = List("paused")
	ListPlanning  = List("planning")
)

func UserSeriesQuery(ctx context.Context) *builder.ModelBuilder[*UserSeries] {
	return builder.From[*UserSeries]().WithContext(ctx)
}

var _ builder.Scoper = &UserSeries{}

func (b *UserSeries) Scopes() []*builder.Scope {
	return []*builder.Scope{
		builder.SoftDeletes,
		UserScoped,
	}
}
