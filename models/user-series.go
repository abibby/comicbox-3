package models

import (
	"github.com/abibby/bob"
	"github.com/abibby/bob/selects"
	"github.com/google/uuid"
)

type UserSeries struct {
	BaseModel
	SeriesName string    `json:"-"    db:"series_name,primary"`
	UserID     uuid.UUID `json:"-"    db:"user_id,primary"`
	List       List      `json:"list" db:"list"`
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

func UserSeriesQuery() *selects.Builder[*UserSeries] {
	return bob.From[*UserSeries]()
}
