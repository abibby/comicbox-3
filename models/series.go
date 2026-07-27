package models

import (
	"bytes"
	"context"
	"fmt"
	"image"
	"os"
	"path"
	"strconv"
	"strings"

	"github.com/abibby/comicbox-3/app/providers"
	"github.com/abibby/comicbox-3/config"
	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/server/router"
	"github.com/abibby/nulls"
	salusadb "github.com/abibby/salusa/database"
	"github.com/abibby/salusa/database/builder"
	"github.com/abibby/salusa/database/hooks"
	"github.com/abibby/salusa/database/jsoncolumn"
	"github.com/abibby/salusa/database/model/modeldi"
	"github.com/buckket/go-blurhash"
)

//go:generate spice generate:migration
type Series struct {
	BaseModel
	Slug               string                   `json:"slug"          db:"name,primary"`
	Name               string                   `json:"name"          db:"display_name"`
	Directory          string                   `json:"directory"     db:"directory"`
	CoverURL           string                   `json:"cover_url"     db:"-"`
	MetadataID         *MetadataID              `json:"metadata_id"   db:"metadata_id,nullable"`
	Description        string                   `json:"description"   db:"description"`
	Aliases            jsoncolumn.Slice[string] `json:"aliases"       db:"aliases"`
	Genres             jsoncolumn.Slice[string] `json:"genres"        db:"genres"`
	Tags               jsoncolumn.Slice[string] `json:"tags"          db:"tags"`
	Year               *nulls.Int               `json:"year"          db:"year"`
	CoverImage         string                   `json:"-"             db:"cover_image_path"`
	MetadataUpdatedAt  *database.Time           `json:"-"             db:"metadata_updated_at"`
	LockedFields       jsoncolumn.Slice[string] `json:"locked_fields" db:"locked_fields"`
	CoverImageBlurHash string                   `json:"cover_image_blur_hash" db:"cover_image_blur_hash"`

	UserSeries *builder.HasOne[*UserSeries] `json:"user_series" db:"-" local:"name" foreign:"series_name"`
}

func init() {
	providers.Add(modeldi.Register[*Series])
}

type MetadataID string
type MetadataService string

const (
	MetadataServiceAnilist   = "anilist"
	MetadataServiceComicVine = "comicvine"
	MetadataServiceLocal     = "local"
)

func NewAnilistID(id int) *MetadataID {
	mid := MetadataID(fmt.Sprintf("%s://%d", MetadataServiceAnilist, id))
	return &mid
}
func NewComicVineID(id int) *MetadataID {
	mid := MetadataID(fmt.Sprintf("%s://%d", MetadataServiceComicVine, id))
	return &mid
}
func NewLocalID(id string) *MetadataID {
	mid := MetadataID(fmt.Sprintf("%s://%s", MetadataServiceLocal, id))
	return &mid
}

func (m MetadataID) ID() (MetadataService, string) {
	parts := strings.SplitN(string(m), "://", 2)
	if len(parts) != 2 {
		return "", ""
	}
	return MetadataService(parts[0]), parts[1]
}
func (m *MetadataID) IntID() (MetadataService, int) {
	service, strID := m.ID()
	id, err := strconv.Atoi(strID)
	if err != nil {
		return "", 0
	}
	return service, id
}

func SeriesQuery(ctx context.Context) *builder.ModelBuilder[*Series] {
	return builder.From[*Series]().WithContext(ctx)
}

var _ hooks.AfterLoader = &Series{}
var _ builder.Scoper = &Series{}

func (*Series) Table() string {
	return "series"
}
func (*Series) PrimaryKey() string {
	return "name"
}

func (s *Series) AfterLoad(ctx context.Context, tx salusadb.DB) error {
	s.CoverURL = router.MustURL(ctx, "series.thumbnail", "slug", s.Slug)
	return nil
}
func (s *Series) DirectoryPath() string {
	return path.Join(config.LibraryPath, s.Directory)
}
func (s *Series) CoverImagePath() string {
	return path.Join(config.LibraryPath, s.CoverImage)
}

func (s *Series) UpdateBlurHash() error {
	f, err := os.Open(s.CoverImagePath())
	if err != nil {
		return fmt.Errorf("Series.updateBlurHash: open file: %w", err)
	}
	img, _, err := image.Decode(f)
	if err != nil {
		return fmt.Errorf("Series.updateBlurHash: decode: %w", err)
	}
	s.CoverImageBlurHash, err = blurhash.Encode(4, 4, img)
	return nil
}

func Slug(s string) string {
	capOffset := byte('a' - 'A')
	out := make([]byte, 0, len(s))
	lastC := byte(0)
	for _, c := range []byte(s) {
		var newC byte
		if 'a' <= c && c <= 'z' {
			newC = c
		} else if 'A' <= c && c <= 'Z' {
			newC = c + capOffset
		} else {
			newC = '-'
		}
		if newC == '-' && lastC == '-' {
			continue
		}
		out = append(out, newC)
		lastC = newC
	}
	return string(bytes.Trim(out, "-"))
}

func DeleteEmptySeries(ctx context.Context, tx salusadb.DB) error {
	return SeriesQuery(ctx).
		WhereNotExists(BookQuery(ctx).WhereColumn("books.series", "=", "series.name")).
		Chunk(tx, func(series []*Series) error {
			slugs := make([]any, len(series))
			for i, s := range series {
				slugs[i] = s.Slug
			}
			return SeriesQuery(ctx).WhereIn("name", slugs).Delete(tx)
		})
}
