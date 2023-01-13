package syncmap

import "sync"

type SyncMap[K comparable, V any] struct {
	m   map[K]V
	mtx *sync.RWMutex
}

func New[K comparable, V any]() *SyncMap[K, V] {
	return &SyncMap[K, V]{
		m:   map[K]V{},
		mtx: &sync.RWMutex{},
	}
}

func (m *SyncMap[K, V]) Get(k K) (V, bool) {
	m.mtx.RLock()
	v, ok := m.m[k]
	m.mtx.RUnlock()
	return v, ok
}

func (m *SyncMap[K, V]) Set(k K, v V) {
	m.mtx.Lock()
	m.m[k] = v
	m.mtx.Unlock()
}

func (m *SyncMap[K, V]) Delete(k K) {
	m.mtx.Lock()
	delete(m.m, k)
	m.mtx.Unlock()
}
