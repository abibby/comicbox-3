package metadata

import (
	"context"
	"strconv"
	"strings"

	htmltomarkdown "github.com/JohannesKaufmann/html-to-markdown/v2"
	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/services/comicvine"
)

type ComicVineMetaProvider struct {
	client *comicvine.Client
}

func NewComicVineMetaProvider() *ComicVineMetaProvider {
	return &ComicVineMetaProvider{
		client: comicvine.New(),
	}
}

var _ MetaProvider = (*ComicVineMetaProvider)(nil)

// GetSeries implements MetaProvider.
func (c *ComicVineMetaProvider) GetSeries(ctx context.Context, metaID *models.MetadataID) (SeriesMetadata, error) {
	service, id := metaID.IntID()
	if service != models.MetadataServiceComicVine {
		return SeriesMetadata{}, ErrWrongService
	}
	volume, err := c.client.Volume(id)
	if err != nil {
		return SeriesMetadata{}, err
	}

	return comicVineSeriesMetadata(&volume.Results), nil
}

// SearchSeries implements MetaProvider.
func (c *ComicVineMetaProvider) SearchSeries(ctx context.Context, name string) ([]DistanceMetadata, error) {
	resp, err := c.client.SearchVolume(name)
	if err != nil {
		return nil, err
	}

	matches := make([]DistanceMetadata, len(resp.Results))

	for i, volume := range resp.Results {
		matches[i] = comicVineSeriesMetadata(&volume).WithDistance(name)
	}

	return matches, nil
}

func comicVineSeriesMetadata(volume *comicvine.Volume) SeriesMetadata {
	year, _ := strconv.Atoi(volume.StartYear)

	rawAliases := strings.Split(volume.Aliases, "\n")
	aliases := make([]string, 0, len(rawAliases))
	for _, rawAlias := range rawAliases {
		alias := strings.TrimSpace(rawAlias)
		if alias != "" {
			aliases = append(aliases, alias)
		}
	}

	tags := make([]string, len(volume.Concepts))
	for i, concept := range volume.Concepts {
		tags[i] = concept.Name
	}

	description := ""
	mdDisc, err := htmltomarkdown.ConvertString(volume.Description)
	if err == nil {
		description = mdDisc
	}

	return SeriesMetadata{
		ID:            models.NewComicVineID(volume.ID),
		Service:       models.MetadataServiceComicVine,
		Title:         volume.Name,
		Year:          year,
		Description:   description,
		Aliases:       aliases,
		CoverImageURL: volume.Image.OriginalUrl,
		Publisher:     volume.Publisher.Name,
		// Staff:
		// Genres: volume.Genres,
		Tags: tags,
	}
}
