package models

import (
	"context"
	"fmt"

	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/salusa/database/builder"
	"github.com/abibby/salusa/request"
	"github.com/google/uuid"
)

//go:generate spice generate:migration
type UserSeries struct {
	BaseModel
	SeriesSlug string        `json:"-"            db:"series_name,primary"`
	UserID     uuid.UUID     `json:"-"            db:"user_id,primary"`
	List       List          `json:"list"         db:"list"`
	LastReadAt database.Time `json:"last_read_at" db:"last_read_at"`

	Series *builder.BelongsTo[*Series] `json:"-" foreign:"series_name" owner:"name"`
	User   *builder.BelongsTo[*User]   `json:"-"`
}

type List string

var _ request.Validator = List("")

const (
	ListNone      = List("")
	ListReading   = List("reading")
	ListDropped   = List("dropped")
	ListCompleted = List("completed")
	ListPaused    = List("paused")
	ListPlanning  = List("planning")
)

func (l List) Valid() error {
	switch l {
	case ListNone, ListReading, ListDropped, ListCompleted, ListPaused, ListPlanning:
		return nil
	default:
		return fmt.Errorf("%s is not a valid list", l)
	}
}

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

func UserSeriesQuery(ctx context.Context) *builder.ModelBuilder[*UserSeries] {
	return builder.From[*UserSeries]().WithContext(ctx)
}

var _ builder.Scoper = &UserSeries{}

func (b *UserSeries) Scopes() []*builder.Scope {
	return []*builder.Scope{
		UserScoped,
	}
}
