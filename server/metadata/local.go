package metadata

import (
	"context"
	"net/url"
	"time"

	"github.com/abibby/comicbox-3/models"
	"github.com/abibby/comicbox-3/server/auth"
	"github.com/abibby/salusa/database/builder"
	"github.com/abibby/salusa/di"
	"github.com/google/uuid"
	"github.com/jmoiron/sqlx"
)

type LocalMetaProvider struct {
}

var _ MetaProvider = (*LocalMetaProvider)(nil)

func NewLocalMetaProvider() *LocalMetaProvider {
	return &LocalMetaProvider{}
}

// GetSeries implements MetaProvider.
func (l *LocalMetaProvider) GetSeries(ctx context.Context, id *models.MetadataID) (SeriesMetadata, error) {
	service, slug := id.ID()

	if service != models.MetadataServiceLocal {
		return SeriesMetadata{}, ErrWrongService
	}
	db, err := di.Resolve[*sqlx.DB](ctx)
	if err != nil {
		return SeriesMetadata{}, err
	}
	book, err := models.BookQuery(ctx).
		Where("series", "=", slug).
		OrderBy("sort").
		First(db)
	if err != nil {
		return SeriesMetadata{}, err
	}
	uri, err := addToken(book.CoverURL)
	if err != nil {
		return SeriesMetadata{}, err
	}
	return SeriesMetadata{
		ID:            models.NewLocalID(book.SeriesSlug),
		Service:       models.MetadataServiceLocal,
		CoverImageURL: uri,
	}, nil
}

// SearchSeries implements MetaProvider.
func (l *LocalMetaProvider) SearchSeries(ctx context.Context, name string) ([]DistanceMetadata, error) {
	db, err := di.Resolve[*sqlx.DB](ctx)
	if err != nil {
		return nil, err
	}
	book, err := models.BookQuery(ctx).
		WhereHas("Series", func(q *builder.Builder) *builder.Builder {
			return q.Where("display_name", "=", name)
		}).
		OrderBy("sort").
		First(db)
	if err != nil {
		return nil, err
	}

	if book == nil {
		return []DistanceMetadata{}, nil
	}

	uri, err := addToken(book.CoverURL)
	if err != nil {
		return nil, err
	}

	return []DistanceMetadata{
		{
			MatchDistance: 15,
			SeriesMetadata: SeriesMetadata{
				ID:            models.NewLocalID(book.SeriesSlug),
				Service:       models.MetadataServiceLocal,
				CoverImageURL: uri,
				Title:         name,
			},
		},
	}, nil
}

func addToken(uri string) (string, error) {
	u, err := url.Parse(uri)
	if err != nil {
		return "", err
	}

	token, err := auth.GenerateToken(uuid.UUID{}, auth.WithPurpose(auth.ScopeImage), auth.WithLifetime(time.Hour))
	if err != nil {
		return "", err
	}

	q := u.Query()
	q.Set("_token", token)
	u.RawQuery = q.Encode()

	return u.String(), nil
}
