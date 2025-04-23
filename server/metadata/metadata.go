package metadata

import (
	"context"
	"errors"
	"strings"

	"github.com/abibby/comicbox-3/models"
	"github.com/agnivade/levenshtein"
	"golang.org/x/text/unicode/norm"
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
	Title         string                 `json:"title"`
	Year          int                    `json:"year"`
	Description   string                 `json:"description"`
	Aliases       []string               `json:"aliases"`
	CoverImageURL string                 `json:"cover_image_url"`
	Staff         []Staff                `json:"staff"`
	Genres        []string               `json:"genres"`
	Tags          []string               `json:"tags"`
	Publisher     string                 `json:"publisher"`
}

type DistanceMetadata struct {
	SeriesMetadata
	MatchDistance int `json:"match_distance"`
}

func (s SeriesMetadata) WithDistance(str string) DistanceMetadata {
	normalStr := normalize(str)
	minDistance := levenshtein.ComputeDistance(normalStr, normalize(s.Title))
	for _, alias := range s.Aliases {
		dist := levenshtein.ComputeDistance(normalStr, normalize(alias))
		if dist < minDistance {
			minDistance = dist
		}
	}
	return DistanceMetadata{
		SeriesMetadata: s,
		MatchDistance:  minDistance,
	}
}
func normalize(s string) string {
	return strings.ToLower(norm.NFC.String(s))
}

type MetaProvider interface {
	GetSeries(ctx context.Context, id *models.MetadataID) (SeriesMetadata, error)
	SearchSeries(ctx context.Context, name string) ([]DistanceMetadata, error)
}

func MetaProviderFactory() MetaProvider {
	return NewMetadataMux(
		NewAnilistMetaProvider(),
		NewComicVineMetaProvider(),
	)
}
