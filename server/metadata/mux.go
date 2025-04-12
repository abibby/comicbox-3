package metadata

import (
	"context"
	"errors"
	"sync"
	"sync/atomic"

	"github.com/abibby/comicbox-3/models"
)

type MetadataMux struct {
	providers []MetaProvider
}

var _ MetaProvider = (*MetadataMux)(nil)

func NewMetadataMux(providers ...MetaProvider) *MetadataMux {
	return &MetadataMux{
		providers: providers,
	}
}

// GetSeries implements MetaProvider.
func (m *MetadataMux) GetSeries(ctx context.Context, id *models.MetadataID) (SeriesMetadata, error) {
	for _, provider := range m.providers {
		result, err := provider.GetSeries(ctx, id)
		if !errors.Is(err, ErrWrongService) {
			return result, err
		}
	}
	return SeriesMetadata{}, ErrWrongService
}

// SearchSeries implements MetaProvider.
func (m *MetadataMux) SearchSeries(ctx context.Context, name string) ([]SeriesMetadata, error) {
	meta := make([][]SeriesMetadata, len(m.providers))

	ctx, cancel := context.WithCancelCause(ctx)
	defer cancel(nil)

	total := int32(0)
	wg := &sync.WaitGroup{}
	for i, p := range m.providers {
		wg.Add(1)
		go func(p MetaProvider) {
			defer wg.Done()
			result, err := p.SearchSeries(ctx, name)
			if err != nil {
				cancel(err)
				return
			}
			meta[i] = result
			atomic.AddInt32(&total, int32(len(result)))
		}(p)
	}
	wg.Wait()

	err := context.Cause(ctx)
	if err != nil {
		return nil, err
	}

	result := make([]SeriesMetadata, 0, total)

	for _, m := range meta {
		result = append(result, m...)
	}

	return result, nil
}
