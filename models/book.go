package models

import (
	"archive/zip"
	"context"
	"encoding/json"
	"fmt"
	"sort"
	"strings"

	"github.com/abibby/comicbox-3/server/router"
	"github.com/abibby/nulls"
	"github.com/abibby/salusa/database"
	"github.com/abibby/salusa/database/builder"
	"github.com/abibby/salusa/database/hooks"
	"github.com/abibby/salusa/database/model"
	"github.com/google/uuid"
	"github.com/pkg/errors"
)

var (
	ErrPageNotFound = fmt.Errorf("page not found")
)

type BasePage struct {
	Type   PageType `json:"type"`
	Height int      `json:"height"`
	Width  int      `json:"width"`
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

//go:generate spice generate:migration
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
	LongStrip   bool                         `json:"long_strip" db:"long_strip"`
	Sort        string                       `json:"sort"       db:"sort,index"`
	File        string                       `json:"file"       db:"file"`
	CoverURL    string                       `json:"cover_url"  db:"-"`
	UserBook    *builder.HasOne[*UserBook]   `json:"user_book"  db:"-"`
	UserSeries  *builder.HasOne[*UserSeries] `json:"-"          db:"-" local:"series" foreign:"series_name"`
	Series      *builder.BelongsTo[*Series]  `json:"-"          db:"-" foreign:"series" owner:"name"`
}

func BookQuery(ctx context.Context) *builder.ModelBuilder[*Book] {
	return builder.From[*Book]().WithContext(ctx)
}

var _ hooks.BeforeSaver = &Book{}

var _ hooks.AfterLoader = &Book{}
var _ builder.Scoper = &Book{}

func (b *Book) Scopes() []*builder.Scope {
	return []*builder.Scope{
		builder.SoftDeletes,
	}
}

func (b *Book) BeforeSave(ctx context.Context, tx database.DB) error {
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

func (b *Book) updateSeries(ctx context.Context, tx database.DB) error {
	seriesChange := false
	err := builder.LoadMissing(tx, b, "Series")
	if err != nil {
		return errors.Wrap(err, "failed find a series from book")
	}
	s, _ := b.Series.Value()
	if s == nil {
		seriesChange = true
		s = &Series{Name: b.SeriesName}
	}
	changed, err := s.UpdateFirstBook(ctx, tx, b)
	if err != nil {
		return errors.Wrap(err, "failed update series first book")
	}
	seriesChange = seriesChange || changed
	if seriesChange {
		err = model.SaveContext(ctx, tx, s)
		if err != nil {
			return errors.Wrap(err, "failed to create series from book")
		}
	}
	return nil
}

func (b *Book) AfterLoad(ctx context.Context, tx database.DB) error {
	err := json.Unmarshal(b.RawAuthors, &b.Authors)
	if err != nil {
		return err
	}

	err = json.Unmarshal(b.RawPages, &b.Pages)
	if err != nil {
		return err
	}

	for i, page := range b.Pages {
		page.URL = router.MustURL(ctx, "book.page", "id", b.ID.String(), "page", fmt.Sprint(i))
		page.ThumbnailURL = router.MustURL(ctx, "book.thumbnail", "id", b.ID.String(), "page", fmt.Sprint(i))
	}

	b.CoverURL = router.MustURL(ctx, "book.thumbnail", "id", b.ID.String(), "page", fmt.Sprint(b.CoverPage()))
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

func ZippedImages(reader *zip.ReadCloser) ([]*zip.File, error) {
	sort.Slice(reader.File, func(i, j int) bool {
		return strings.Compare(reader.File[i].Name, reader.File[j].Name) < 0
	})

	imageFiles := reader.File[:0]
	for _, x := range reader.File {
		lowerName := strings.ToLower(x.Name)
		if strings.HasSuffix(lowerName, ".jpg") ||
			strings.HasSuffix(lowerName, ".jpeg") ||
			strings.HasSuffix(lowerName, ".png") ||
			strings.HasSuffix(lowerName, ".bmp") ||
			strings.HasSuffix(lowerName, ".gif") ||
			strings.HasSuffix(lowerName, ".webp") ||
			strings.HasSuffix(lowerName, ".tiff") {
			imageFiles = append(imageFiles, x)
		}
	}
	return imageFiles, nil
}
