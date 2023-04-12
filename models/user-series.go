package models

import (
	"context"

	"github.com/abibby/bob"
	"github.com/abibby/bob/selects"
	"github.com/google/uuid"
)

type UserSeries struct {
	BaseModel
	SeriesName string    `json:"-"                      db:"series_name,primary"`
	UserID     uuid.UUID `json:"-"                      db:"user_id,primary"`
	List       List      `json:"list"                   db:"list"`
	// LatestBookID *uuid.UUID             `json:"latest_book_id"         db:"latest_book_id"`
	// LatestBook   *selects.HasOne[*Book] `json:"latest_book,omit_empty" db:"-" local:"latest_book_id" foreign:"id"`
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

func UserSeriesQuery(ctx context.Context) *selects.Builder[*UserSeries] {
	return bob.From[*UserSeries]().WithContext(ctx)
}

var _ bob.Scoper = &UserSeries{}

func (b *UserSeries) Scopes() []*bob.Scope {
	return []*bob.Scope{
		bob.SoftDeletes,
		UserScoped,
		// WithLatestBookID,
	}
}

var WithLatestBookID = &bob.Scope{
	Name: "with-latest-book-id",
	Apply: func(b *selects.SubBuilder) *selects.SubBuilder {
		return b.SelectSubquery(
			BookQuery(b.Context()).
				Select("id").
				WhereColumn("series", "=", "books.series").
				WhereHas("UserBook", func(q *selects.SubBuilder) *selects.SubBuilder {
					return q.Or(func(q *selects.WhereList) {
						q.Where("current_page", "<", "books.page_count").
							Where("current_page", "=", nil)
					})
				}).
				OrderBy("sort"),
			"latest_book_id",
		)
		// BookQuery(ctx).
		// Where("series", "=", b.Series).
		// WhereHas("UserBook", func(q *selects.SubBuilder) *selects.SubBuilder {
		// 	return q.Or(func(q *selects.WhereList) {
		// 		q.Where("current_page", "<", "books.page_count").
		// 			Where("current_page", "=", nil)
		// 	})
		// }).
		// OrderBy("sort").
		// First(tx)
	},
}
