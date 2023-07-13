package models

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/abibby/bob"
	"github.com/abibby/bob/builder"
	"github.com/abibby/bob/hooks"
	"github.com/abibby/bob/selects"
	"github.com/abibby/comicbox-3/server/router"
	"github.com/abibby/nulls"
	"github.com/google/uuid"
	"github.com/pkg/errors"
)

type BasePage struct {
	Type PageType `json:"type"`
}
type Page struct {
	BasePage
	URL          string `json:"url"`
	ThumbnailURL string `json:"thumbnail_url"`
}

type PageType string

func (pt PageType) Options() map[string]string {
	return map[string]string{
		"FrontCover":  string(PageTypeFrontCover),
		"Story":       string(PageTypeStory),
		"Spread":      string(PageTypeSpread),
		"SpreadSplit": string(PageTypeSpreadSplit),
		"Deleted":     string(PageTypeDeleted),
	}
}

const (
	PageTypeFrontCover  = PageType("FrontCover")
	PageTypeStory       = PageType("Story")
	PageTypeSpread      = PageType("Spread")
	PageTypeSpreadSplit = PageType("SpreadSplit")
	PageTypeDeleted     = PageType("Deleted")
)

//go:generate go run github.com/abibby/bob/bob-cli@latest generate
type Book struct {
	BaseModel
	ID          uuid.UUID                    `json:"id"         db:"id,primary"`
	Title       string                       `json:"title"      db:"title"`
	Chapter     *nulls.Float64               `json:"chapter"    db:"chapter"`
	Volume      *nulls.Float64               `json:"volume"     db:"volume"`
	SeriesName  string                       `json:"series"     db:"series"`
	Authors     []string                     `json:"authors"    db:"-"`
	RawAuthors  []byte                       `json:"-"          db:"authors,type:json"`
	Pages       []*Page                      `json:"pages"      db:"-"`
	RawPages    []byte                       `json:"-"          db:"pages,type:json"`
	PageCount   int                          `json:"page_count" db:"page_count"`
	RightToLeft bool                         `json:"rtl"        db:"rtl"`
	Sort        string                       `json:"sort"       db:"sort,index"`
	File        string                       `json:"file"       db:"file"`
	CoverURL    string                       `json:"cover_url"  db:"-"`
	UserBook    *selects.HasOne[*UserBook]   `json:"user_book"  db:"-"`
	UserSeries  *selects.HasOne[*UserSeries] `json:"-"          db:"-" local:"series" foreign:"series_name"`
	Series      *selects.BelongsTo[*Series]  `json:"-"          db:"-" foreign:"series" owner:"name"`
}

func BookQuery(ctx context.Context) *selects.Builder[*Book] {
	return bob.From[*Book]().WithContext(ctx)
}

var _ hooks.BeforeSaver = &Book{}

var _ hooks.AfterLoader = &Book{}
var _ bob.Scoper = &Book{}

func (b *Book) Scopes() []*bob.Scope {
	return []*bob.Scope{
		bob.SoftDeletes,
	}
}

func (b *Book) BeforeSave(ctx context.Context, tx builder.QueryExecer) error {
	err := b.updateSeries(ctx, tx)
	if err != nil {
		return err
	}
	if b.Authors == nil {
		b.Authors = []string{}
	}
	err = marshal(&b.RawAuthors, b.Authors)
	if err != nil {
		return err
	}
	basePages := make([]*BasePage, len(b.Pages))
	if b.Pages != nil {
		for i, page := range b.Pages {
			basePages[i] = &page.BasePage
		}
	}
	err = marshal(&b.RawPages, basePages)
	if err != nil {
		return err
	}

	b.PageCount = len(b.Pages)

	volume := float64(999_999_999.999)
	if !b.Volume.IsNull() {
		volume = b.Volume.Float64()
	}

	b.Sort = fmt.Sprintf(
		"%s|%013.3f|%013.3f|%s",
		b.SeriesName,
		volume,
		b.Chapter.Float64(),
		b.Title,
	)

	return nil
}

func (b *Book) updateSeries(ctx context.Context, tx builder.QueryExecer) error {
	seriesChange := false
	err := selects.LoadMissing(tx, b, "Series")
	if err != nil {
		return errors.Wrap(err, "failed find a series from book")
	}
	s, ok := b.Series.Value()
	if !ok {
		seriesChange = true
		s = &Series{Name: b.SeriesName}
	}
	changed, err := s.UpdateFirstBook(ctx, tx, b)
	if err != nil {
		return errors.Wrap(err, "failed update series first book")
	}
	seriesChange = seriesChange || changed
	if seriesChange {
		err = bob.SaveContext(ctx, tx, s)
		if err != nil {
			return errors.Wrap(err, "failed to create series from book")
		}
	}
	return nil
}

func (b *Book) AfterLoad(ctx context.Context, tx builder.QueryExecer) error {
	err := json.Unmarshal(b.RawAuthors, &b.Authors)
	if err != nil {
		return err
	}

	err = json.Unmarshal(b.RawPages, &b.Pages)
	if err != nil {
		return err
	}

	for i, page := range b.Pages {
		page.URL = router.MustURL("book.page", "id", b.ID.String(), "page", fmt.Sprint(i))
		page.ThumbnailURL = router.MustURL("book.thumbnail", "id", b.ID.String(), "page", fmt.Sprint(i))
	}

	b.CoverURL = router.MustURL("book.thumbnail", "id", b.ID.String(), "page", fmt.Sprint(b.CoverPage()))
	return nil
}
func (b *Book) CoverPage() int {
	fallback := 0
	for i, page := range b.Pages {
		if page.Type == PageTypeFrontCover {
			return i
		}
		if page.Type != PageTypeDeleted && fallback == 0 {
			fallback = i
		}
	}
	return fallback
}
