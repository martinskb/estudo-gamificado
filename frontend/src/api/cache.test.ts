import { describe, expect, it } from 'vitest'
import { createCache, freshFor } from './cache'

function memory() {
  const data = new Map<string, string>()
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
    get size() {
      return data.size
    },
  }
}

describe('freshFor', () => {
  it('picks a time-to-fresh per kind of data', () => {
    expect(freshFor('/topics?sort=recent')).toBe(30_000)
    expect(freshFor('/topics/3')).toBe(30_000)
    expect(freshFor('/progress')).toBe(30_000)
    expect(freshFor('/ranking')).toBe(60_000)
    expect(freshFor('/trails/2')).toBe(600_000)
    expect(freshFor('/catalog?q=')).toBe(3_600_000)
    expect(freshFor('/qualquer')).toBe(30_000)
  })
})

describe('cache', () => {
  it('returns saved data with its freshness', () => {
    let now = 1_000
    const cache = createCache(memory(), () => now)
    cache.set('/progress', { streak: 3 })
    expect(cache.get('/progress')).toEqual({ data: { streak: 3 }, fresh: true })
    now += 30_001
    expect(cache.get('/progress')).toEqual({ data: { streak: 3 }, fresh: false })
  })

  it('survives a reload through storage', () => {
    const store = memory()
    createCache(store, () => 0).set('/topics', [1, 2])
    expect(createCache(store, () => 10).get('/topics')?.data).toEqual([1, 2])
  })

  it('after any change everything is shown but revalidated', () => {
    const cache = createCache(memory(), () => 0)
    cache.set('/topics', [1])
    cache.set('/trails/2', { id: 2 })
    cache.markAllStale()
    expect(cache.get('/topics')).toEqual({ data: [1], fresh: false })
    expect(cache.get('/trails/2')?.fresh).toBe(false)
  })

  it('clear removes everything, including from storage (logout on a shared PC)', () => {
    const store = memory()
    const cache = createCache(store, () => 0)
    cache.set('/topics', [1])
    cache.clear()
    expect(cache.get('/topics')).toBeNull()
    expect(createCache(store, () => 0).get('/topics')).toBeNull()
  })

  it('drops entries older than a day', () => {
    let now = 0
    const cache = createCache(memory(), () => now)
    cache.set('/progress', {})
    now = 86_400_001
    expect(cache.get('/progress')).toBeNull()
  })

  it('works without storage (private window)', () => {
    const cache = createCache(null, () => 0)
    cache.set('/progress', { a: 1 })
    expect(cache.get('/progress')?.data).toEqual({ a: 1 })
  })
})
