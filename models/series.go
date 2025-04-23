package models

import (
	"bytes"
	"context"
	"fmt"
	"path"
	"strconv"
	"strings"

	"github.com/abibby/comicbox-3/app/providers"
	"github.com/abibby/comicbox-3/config"
	"github.com/abibby/comicbox-3/server/router"
	"github.com/abibby/nulls"
	"github.com/abibby/salusa/database"
	"github.com/abibby/salusa/database/builder"
	"github.com/abibby/salusa/database/hooks"
	"github.com/abibby/salusa/database/model/modeldi"
)

//go:generate spice generate:migration
type Series struct {
	BaseModel
	Slug           string      `json:"slug"        db:"name,primary"`
	Name           string      `json:"name"        db:"display_name"`
	Directory      string      `json:"directory"   db:"directory"`
	CoverURL       string      `json:"cover_url"   db:"-"`
	MetadataID     *MetadataID `json:"metadata_id" db:"metadata_id,nullable"`
	Description    string      `json:"description" db:"description"`
	Aliases        JSONStrings `json:"aliases"     db:"aliases"`
	Genres         JSONStrings `json:"genres"      db:"genres"`
	Tags           JSONStrings `json:"tags"        db:"tags"`
	Year           *nulls.Int  `json:"year"        db:"year"`
	CoverImagePath string      `json:"-"           db:"cover_image_path"`

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
)

func NewAnilistID(id int) *MetadataID {
	mid := MetadataID(fmt.Sprintf("%s://%d", MetadataServiceAnilist, id))
	return &mid
}
func NewComicVineID(id int) *MetadataID {
	mid := MetadataID(fmt.Sprintf("%s://%d", MetadataServiceComicVine, id))
	return &mid
}

func (m MetadataID) ID() (MetadataService, string, error) {
	parts := strings.SplitN(string(m), "://", 2)
	if len(parts) != 2 {
		return "", "", fmt.Errorf("MetadataID: invalid format: %s", m)
	}
	return MetadataService(parts[0]), parts[1], nil
}
func (m *MetadataID) IntID() (MetadataService, int) {
	service, strID, err := m.ID()
	if err != nil {
		return "", 0
	}
	id, err := strconv.Atoi(strID)
	if err != nil {
		return "", 0
	}
	return service, id
}

func SeriesQuery(ctx context.Context) *builder.ModelBuilder[*Series] {
	return builder.From[*Series]().WithContext(ctx)
}

var _ hooks.BeforeSaver = &Series{}
var _ hooks.AfterLoader = &Series{}
var _ builder.Scoper = &Series{}

func (*Series) Table() string {
	return "series"
}
func (*Series) PrimaryKey() string {
	return "name"
}

func (s *Series) AfterLoad(ctx context.Context, tx database.DB) error {
	s.CoverURL = router.MustURL(ctx, "series.thumbnail", "slug", s.Slug)
	return nil
}
func (s *Series) DirectoryPath() string {
	return path.Join(config.LibraryPath, s.Directory)
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

func DeleteEmptySeries(ctx context.Context, tx database.DB) error {
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
