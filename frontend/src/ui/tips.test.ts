import { describe, expect, it } from 'vitest'
import { createTips } from './tips'

function memory() {
  const data = new Map<string, string>()
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) }
}

describe('tips shown once', () => {
  it('shows a tip until it is dismissed, then never again (even after reload)', () => {
    const store = memory()
    const tips = createTips(store)
    expect(tips.shouldShow('ranking')).toBe(true)
    tips.dismiss('ranking')
    expect(tips.shouldShow('ranking')).toBe(false)
    expect(tips.shouldShow('pontos')).toBe(true)
    expect(createTips(store).shouldShow('ranking')).toBe(false)
  })

  it('without storage, tips still work for the session', () => {
    const tips = createTips(null)
    tips.dismiss('x')
    expect(tips.shouldShow('x')).toBe(false)
  })
})
