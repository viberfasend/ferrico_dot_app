import { describe, it, expect } from 'vitest'
import { setListCacheEntry } from './App'
import { makeBookmark } from './test-utils'
import type { Bookmark } from './types'

function rows(n: number): Bookmark[] {
  return Array.from({ length: n }, (_, i) => makeBookmark({ id: `bm-${i}`, title: `B${i}` }))
}

describe('setListCacheEntry (list cache LRU)', () => {
  it('caches rows for a non-search view', () => {
    const cache = new Map<string, Bookmark[]>()
    setListCacheEntry(cache, 'all|', rows(2), '')
    expect(cache.get('all|')).toHaveLength(2)
  })

  it('never caches search-result views (non-empty search)', () => {
    const cache = new Map<string, Bookmark[]>()
    setListCacheEntry(cache, 'all|rust', rows(5), 'rust')
    setListCacheEntry(cache, 'folder:1|docker', rows(3), 'docker')
    expect(cache.size).toBe(0)
    expect(cache.has('all|rust')).toBe(false)
    expect(cache.has('folder:1|docker')).toBe(false)
  })

  it('evicts the least-recently-used entry once size exceeds 8', () => {
    const cache = new Map<string, Bookmark[]>()
    for (let i = 0; i < 8; i++) setListCacheEntry(cache, `k${i}|`, rows(1), '')
    expect(cache.size).toBe(8)

    setListCacheEntry(cache, 'k8|', rows(1), '')
    expect(cache.size).toBe(8)
    expect(cache.has('k0|')).toBe(false) // oldest evicted
    expect(cache.has('k8|')).toBe(true)
  })

  it('re-setting an existing key refreshes its recency and value', () => {
    const cache = new Map<string, Bookmark[]>()
    for (let i = 0; i < 8; i++) setListCacheEntry(cache, `k${i}|`, rows(1), '')

    setListCacheEntry(cache, 'k0|', rows(9), '') // touch k0 → most-recently-used
    setListCacheEntry(cache, 'k8|', rows(1), '') // evicts k1, not k0

    expect(cache.size).toBe(8)
    expect(cache.get('k0|')).toHaveLength(9) // updated value kept
    expect(cache.has('k0|')).toBe(true)
    expect(cache.has('k1|')).toBe(false) // now the oldest
  })

  it('search skips do not count toward the LRU bound', () => {
    const cache = new Map<string, Bookmark[]>()
    for (let i = 0; i < 20; i++) setListCacheEntry(cache, `all|q${i}`, rows(1), `q${i}`)
    expect(cache.size).toBe(0)
    setListCacheEntry(cache, 'all|', rows(1), '')
    expect(cache.size).toBe(1)
  })
})
