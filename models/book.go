package models

import (
	"archive/zip"
	"context"
	"fmt"
	"path"
	"sort"
	"strings"

	"github.com/abibby/comicbox-3/config"
	"github.com/abibby/comicbox-3/server/router"
	"github.com/abibby/nulls"
	"github.com/abibby/salusa/clog"
	salusadb "github.com/abibby/salusa/database"
	"github.com/abibby/salusa/database/builder"
	"github.com/abibby/salusa/database/hooks"
	"github.com/abibby/salusa/database/jsoncolumn"
	"github.com/abibby/salusa/database/model"
	"github.com/google/uuid"
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
	ID           uuid.UUID                `json:"id"            db:"id,primary"`
	Title        string                   `json:"title"         db:"title"`
	Chapter      *nulls.Float64           `json:"chapter"       db:"chapter"`
	Volume       *nulls.Float64           `json:"volume"        db:"volume"`
	SeriesSlug   string                   `json:"series_slug"   db:"series"`
	Authors      jsoncolumn.Slice[string] `json:"authors"       db:"authors,type:json"`
	Pages        jsoncolumn.Slice[*Page]  `json:"pages"         db:"pages"`
	PageCount    int                      `json:"page_count"    db:"page_count"`
	RightToLeft  bool                     `json:"rtl"           db:"rtl"`
	LongStrip    bool                     `json:"long_strip"    db:"long_strip"`
	Sort         string                   `json:"sort"          db:"sort,index"`
	File         string                   `json:"file"          db:"file"`
	CoverURL     string                   `json:"cover_url"     db:"-"`
	DownloadSize int                      `json:"download_size" db:"download_size"`

	UserBook   *builder.HasOne[*UserBook]   `json:"user_book" db:"-"`
	UserSeries *builder.HasOne[*UserSeries] `json:"-"         db:"-" local:"series" foreign:"series_name"`
	Series     *builder.BelongsTo[*Series]  `json:"series"    db:"-" foreign:"series" owner:"name"`

	originalSeriesSlug string
	saved              bool
}

func BookQuery(ctx context.Context) *builder.ModelBuilder[*Book] {
	return builder.From[*Book]().WithContext(ctx)
}

var _ hooks.BeforeSaver = &Book{}
var _ hooks.AfterSaver = &Book{}

var _ hooks.AfterLoader = &Book{}

func (b *Book) BeforeSave(ctx context.Context, tx salusadb.DB) error {
	if b.Authors == nil {
		b.Authors = []string{}
	}

	if b.DownloadSize == 0 {
		size, err := b.calculateDownloadSize()
		if err != nil {
			clog.Use(ctx).Warn("failed to calculate download size", "err", err)
		} else {
			b.DownloadSize = size
		}
	}

	basePages := make([]*BasePage, len(b.Pages))
	if b.Pages != nil {
		for i, page := range b.Pages {
			basePages[i] = &page.BasePage
		}
	}

	b.PageCount = len(b.Pages)

	volume := float64(999_999_999.999)
	if !b.Volume.IsNull() {
		volume = b.Volume.Float64()
	}

	b.Sort = fmt.Sprintf(
		"%s|%013.3f|%013.3f|%s",
		b.SeriesSlug,
		volume,
		b.Chapter.Float64(),
		b.Title,
	)

	return nil
}

func (b *Book) AfterSave(ctx context.Context, tx salusadb.DB) error {
	if !b.saved {
		err := b.updateUserSeries(ctx, tx)
		if err != nil {
			return err
		}
	}

	err := UpdateUserSeriesLatestBookID(ctx, tx, []string{b.SeriesSlug})
	if err != nil {
		return err
	}

	if b.originalSeriesSlug != b.SeriesSlug {
		err := DeleteEmptySeries(ctx, tx)
		if err != nil {
			return err
		}
	}

	b.updateOriginals()
	return nil
}

func (b *Book) updateUserSeries(ctx context.Context, tx salusadb.DB) error {
	userSeries, err := UserSeriesQuery(ctx).WithoutGlobalScope(UserScoped).Where("series_name", "=", b.SeriesSlug).Get(tx)
	if err != nil {
		return err
	}
	for _, us := range userSeries {
		if us.LatestBookID.Valid {
			continue
		}
		us.LatestBookID = uuid.NullUUID{UUID: b.ID, Valid: true}
		err = model.SaveContext(ctx, tx, us)
		if err != nil {
			return err
		}
	}
	return nil
}

func (b *Book) calculateDownloadSize() (int, error) {
	reader, err := zip.OpenReader(b.FilePath())
	if err != nil {
		return 0, err
	}

	imgs, err := ZippedImages(reader)
	if err != nil {
		return 0, err
	}

	totalSize := 0

	for _, img := range imgs {
		totalSize += int(img.FileInfo().Size())
	}

	return totalSize, nil
}

func (b *Book) AfterLoad(ctx context.Context, tx salusadb.DB) error {
	for i, page := range b.Pages {
		page.URL = router.MustURL(ctx, "book.page", "id", b.ID.String(), "page", fmt.Sprint(i))
		page.ThumbnailURL = router.MustURL(ctx, "book.thumbnail", "id", b.ID.String(), "page", fmt.Sprint(i))
	}

	b.CoverURL = router.MustURL(ctx, "book.thumbnail", "id", b.ID.String(), "page", fmt.Sprint(b.CoverPage()))
	b.updateOriginals()
	return nil
}

func (b *Book) updateOriginals() {
	b.saved = true
	b.originalSeriesSlug = b.SeriesSlug
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

func (b *Book) FilePath() string {
	return path.Join(config.LibraryPath, b.File)
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
