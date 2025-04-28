package metadata

import (
	"context"
	"errors"
	"sort"
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
	if id == nil {
		return SeriesMetadata{}, ErrWrongService
	}
	for _, provider := range m.providers {
		result, err := provider.GetSeries(ctx, id)
		if !errors.Is(err, ErrWrongService) {
			return result, err
		}
	}
	return SeriesMetadata{}, ErrWrongService
}

// SearchSeries implements MetaProvider.
func (m *MetadataMux) SearchSeries(ctx context.Context, name string) ([]DistanceMetadata, error) {
	matchesList := make([][]DistanceMetadata, len(m.providers))

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
			matchesList[i] = result
			atomic.AddInt32(&total, int32(len(result)))
		}(p)
	}
	wg.Wait()

	err := context.Cause(ctx)
	if err != nil {
		return nil, err
	}

	result := make([]DistanceMetadata, 0, total)

	for _, matches := range matchesList {
		result = append(result, matches...)
	}

	sort.Slice(result, func(i, j int) bool {
		return result[i].MatchDistance < result[j].MatchDistance
	})

	return result, nil
}
