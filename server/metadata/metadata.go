package metadata

import (
	"context"
	"errors"

	"github.com/abibby/comicbox-3/models"
)

var ErrNotFound = errors.New("series not found")
var ErrWrongService = errors.New("wrong service")

type StaffRole string

const (
	RoleWriter     = StaffRole("writer")
	RoleArtist     = StaffRole("artist")
	RoleEditor     = StaffRole("editor")
	RoleTranslator = StaffRole("translator")
	RoleAssistant  = StaffRole("assistant")
	RoleLetterer   = StaffRole("letterer")
)

func (pt StaffRole) Options() map[string]string {
	return map[string]string{
		"RoleWriter":     string(RoleWriter),
		"RoleArtist":     string(RoleArtist),
		"RoleEditor":     string(RoleEditor),
		"RoleTranslator": string(RoleTranslator),
		"RoleAssistant":  string(RoleAssistant),
		"RoleLetterer":   string(RoleLetterer),
	}
}

type Staff struct {
	Name string    `json:"name"`
	Role StaffRole `json:"role"`
}

type SeriesMetadata struct {
	ID            *models.MetadataID     `json:"id"`
	Service       models.MetadataService `json:"service"`
	MatchDistance int                    `json:"match_distance"`
	Title         string                 `json:"title"`
	Year          int                    `json:"year"`
	Description   string                 `json:"description"`
	Aliases       []string               `json:"aliases"`
	CoverImageURL string                 `json:"cover_image_url"`
	Staff         []Staff                `json:"staff"`
	Genres        []string               `json:"genres"`
	Tags          []string               `json:"tags"`
}

type MetaProvider interface {
	GetSeries(ctx context.Context, id *models.MetadataID) (SeriesMetadata, error)
	SearchSeries(ctx context.Context, name string) ([]SeriesMetadata, error)
}

func MetaProviderFactory() MetaProvider {
	return NewMetadataMux(
		NewAnilistMetaProvider(),
	)
}
