package metadata

import (
	"context"
	"fmt"
	"io"
	"mime"
	"net/http"
	"os"
	"path"

	htmltomarkdown "github.com/JohannesKaufmann/html-to-markdown/v2"
	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/nulls"
	"github.com/abibby/salusa/clog"
	"github.com/abibby/salusa/database"
	"github.com/abibby/salusa/database/model"
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

	coverPath, err := downloadFile(ctx, metadata.CoverImageURL, path.Join(series.DirectoryPath(), ".comicbox/cover"))
	if err != nil {
		return fmt.Errorf("AnilistMetaProvider.UpdateMetadata: downloading cover: %w", err)
	}
	series.CoverImagePath = coverPath

	return model.SaveContext(ctx, tx, series)
}

func downloadFile(ctx context.Context, url, filePath string) (string, error) {
	client := http.DefaultClient

	req, err := http.NewRequest(http.MethodGet, url, http.NoBody)
	if err != nil {
		return "", err
	}

	resp, err := client.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()

	buff := make([]byte, 512)
	resp.Body.Read(buff)
	mimetype := http.DetectContentType(buff)
	exts, err := mime.ExtensionsByType(mimetype)
	if err != nil {
		return "", fmt.Errorf("cannot find extension: %w", err)
	}
	ext := ""
	if len(exts) > 0 {
		ext = exts[len(exts)-1]
	}

	dir := path.Dir(filePath)
	err = os.MkdirAll(dir, 0777)
	if err != nil {
		return "", fmt.Errorf("failed to create directory: %w", err)
	}

	fullPath := filePath + ext

	f, err := os.OpenFile(fullPath, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, 0644)
	if err != nil {
		return "", fmt.Errorf("failed to open file: %w", err)
	}

	_, err = f.Write(buff)
	if err != nil {
		return "", fmt.Errorf("failed to write file: %w", err)
	}

	_, err = io.CopyBuffer(f, resp.Body, buff)
	if err != nil {
		return "", fmt.Errorf("failed to write file: %w", err)
	}

	return fullPath, nil
}
