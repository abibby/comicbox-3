package cache

import (
	"sync"
	"time"
)

type cacheEntry[V any] struct {
	value        V
	lastAccessed time.Time
}

type Cache[K comparable, V any] struct {
	m    map[K]cacheEntry[V]
	mtx  *sync.Mutex
	open func(k K) (V, error)
}

func New[K comparable, V any](open func(k K) (V, error)) *Cache[K, V] {
	return &Cache[K, V]{
		m:    map[K]cacheEntry[V]{},
		mtx:  &sync.Mutex{},
		open: open,
	}
}

func (c *Cache[K, V]) Get(k K) (V, error) {
	c.mtx.Lock()
	defer c.mtx.Unlock()

	v, ok := c.m[k]
	if !ok {
		val, err := c.open(k)
		if err != nil {
			var zero V
			return zero, err
		}
		v = cacheEntry[V]{
			value: val,
		}
	}
	v.lastAccessed = time.Now()
	c.m[k] = v

	go func() {
		c.mtx.Lock()
		defer c.mtx.Unlock()

		v, ok := c.m[k]
		if !ok {
			return
		}

		if v.lastAccessed.After() {

		}
	}()

	return v.value, nil

}

// var bookCache = syncmap.New[string, *zip.ReadCloser]()

// func openBook(path string) (*zip.ReadCloser, error) {
// 	var err error
// 	file, ok := bookCache.Get(path)
// 	if !ok {
// 		file, err = zip.OpenReader(path)
// 		if err != nil {
// 			return nil, err
// 		}
// 		bookCache.Set(path, file)
// 	}
// 	return file, nil
// }
