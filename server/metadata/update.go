package metadata

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"mime"
	"net/http"
	"os"
	"path"
	"strings"
	"time"

	"github.com/abibby/comicbox-3/config"
	"github.com/abibby/comicbox-3/database"
	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/nulls"
	salusadb "github.com/abibby/salusa/database"
	"github.com/abibby/salusa/di"
	"github.com/abibby/salusa/extra/sets"
	"github.com/abibby/salusa/kernel"
)

func Update(ctx context.Context, tx salusadb.DB, provider MetaProvider, series *models.Series) error {
	bestMatch, err := GetBestMatch(ctx, provider, series)
	if err != nil {
		return err
	}

	return ApplyMetadata(ctx, tx, series, &bestMatch.SeriesMetadata)
}

func GetBestMatch(ctx context.Context, provider MetaProvider, series *models.Series) (*DistanceMetadata, error) {
	var matches []DistanceMetadata
	var err error
	if series.MetadataID == nil || *series.MetadataID == "" {
		matches, err = provider.SearchSeries(ctx, series.Name)
		if err != nil {
			return nil, err
		}
	} else {
		match, err := provider.GetSeries(ctx, series.MetadataID)
		if err != nil {
			return nil, err
		}
		matches = []DistanceMetadata{match.WithDistance(series.Name)}
	}

	var bestMatch *DistanceMetadata

	for _, match := range matches {
		if bestMatch == nil || match.MatchDistance < bestMatch.MatchDistance {
			bestMatch = &match
		}
	}
	return bestMatch, nil
}

func ApplyMetadata(ctx context.Context, tx salusadb.DB, series *models.Series, metadata *SeriesMetadata) error {
	if series.Directory == "" {
		return fmt.Errorf("series directory is not set for %s", series.Slug)
	}

	series.UpdateField("metadata_id")
	series.MetadataID = metadata.ID

	lockedFields := sets.New(series.LockedFields...)

	if metadata.Title != "" && !lockedFields.Has("name") {
		series.UpdateField("name")
		series.Name = metadata.Title
	}

	if metadata.Description != "" && !lockedFields.Has("description") {
		series.UpdateField("description")
		series.Description = metadata.Description
	}

	if len(metadata.Aliases) != 0 && !lockedFields.Has("aliases") {
		series.UpdateField("aliases")
		series.Aliases = metadata.Aliases
	}

	if len(metadata.Genres) != 0 && !lockedFields.Has("genres") {
		series.UpdateField("genres")
		series.Genres = metadata.Genres
	}

	if len(metadata.Tags) != 0 && !lockedFields.Has("tags") {
		series.UpdateField("tags")
		series.Tags = metadata.Tags
	}

	if metadata.Year != 0 && !lockedFields.Has("year") {
		series.UpdateField("year")
		series.Year = nulls.NewInt(metadata.Year)
	}

	coverPath, err := downloadFile(ctx, metadata.CoverImageURL, path.Join(series.DirectoryPath(), ".comicbox/cover"))
	if err != nil {
		return fmt.Errorf("AnilistMetaProvider.UpdateMetadata: downloading cover: %w", err)
	}
	series.CoverImage = strings.Replace(coverPath, config.LibraryPath, "", 1)

	series.MetadataUpdatedAt = database.TimePtr(time.Now())

	return nil
}

func downloadFile(ctx context.Context, url, filePath string) (string, error) {
	client := http.DefaultClient

	req, err := http.NewRequest(http.MethodGet, url, http.NoBody)
	if err != nil {
		return "", err
	}
	var resp *http.Response
	if strings.HasPrefix(url, "/") {
		k, err := di.Resolve[*kernel.Kernel](ctx)
		if err != nil {
			return "", err
		}
		recorder := newResponseRecorder()
		k.RootHandler().ServeHTTP(recorder, req.WithContext(ctx))
		resp = recorder.Response
	} else {

		resp, err = client.Do(req)
		if err != nil {
			return "", err
		}
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

type responseRecorder struct {
	Response *http.Response
	body     *bytes.Buffer
}

func newResponseRecorder() *responseRecorder {
	body := &bytes.Buffer{}
	return &responseRecorder{
		Response: &http.Response{
			StatusCode: 200,
			Status:     http.StatusText(200),
			Header:     http.Header{},
			Body:       io.NopCloser(body),
		},
		body: body,
	}
}

// Header implements http.ResponseWriter.
func (r *responseRecorder) Header() http.Header {
	return r.Response.Header
}

// Write implements http.ResponseWriter.
func (r *responseRecorder) Write(b []byte) (int, error) {
	return r.body.Write(b)
}

// WriteHeader implements http.ResponseWriter.
func (r *responseRecorder) WriteHeader(statusCode int) {
	r.Response.StatusCode = statusCode
	r.Response.Status = http.StatusText(statusCode)
}
