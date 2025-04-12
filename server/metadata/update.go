package metadata

import (
	"context"
	"fmt"

	htmltomarkdown "github.com/JohannesKaufmann/html-to-markdown/v2"
	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/nulls"
	"github.com/abibby/salusa/clog"
	"github.com/abibby/salusa/database"
	"github.com/abibby/salusa/database/model"
	"github.com/google/uuid"
)

func Update(ctx context.Context, tx database.DB, provider MetaProvider, series *models.Series) error {
	var matches []SeriesMetadata
	var err error
	clog.Use(ctx).Info("Updating series metadata", "series", series.Name)
	if series.MetadataID == nil {
		matches, err = provider.SearchSeries(ctx, series.Name)
		if err != nil {
			return err
		}
	} else {
		match, err := provider.GetSeries(ctx, series.MetadataID)
		if err != nil {
			return err
		}
		matches = []SeriesMetadata{match}
	}

	var bestMatch *SeriesMetadata

	for _, match := range matches {
		if bestMatch == nil || match.MatchDistance > bestMatch.MatchDistance {
			bestMatch = &match
		}
	}

	return applyMetadata(ctx, tx, series, bestMatch)
}

func applyMetadata(ctx context.Context, tx database.DB, series *models.Series, metadata *SeriesMetadata) error {

	series.UpdateField("name")
	series.Name = metadata.Title

	series.UpdateField("metadata_id")
	series.MetadataID = metadata.ID

	series.UpdateField("description")
	mdDisc, err := htmltomarkdown.ConvertString(metadata.Description)
	if err == nil {
		series.Description = mdDisc
	} else {
		series.Description = metadata.Description
	}

	series.UpdateField("aliases")
	series.Aliases = metadata.Aliases

	series.UpdateField("genres")
	series.Genres = metadata.Genres

	series.UpdateField("tags")
	series.Tags = metadata.Tags

	series.UpdateField("year")
	series.Year = nulls.NewInt(metadata.Year)

	// if series.CoverImageID.Valid {

	// }

	coverImage, err := models.DownloadFile(ctx, tx, metadata.CoverImageURL)
	if err != nil {
		return fmt.Errorf("AnilistMetaProvider.UpdateMetadata: downloading cover: %w", err)
	}
	series.UpdateField("cover_image_id")
	series.CoverImageID = uuid.NullUUID{UUID: coverImage.ID, Valid: true}

	return model.SaveContext(ctx, tx, series)
}
