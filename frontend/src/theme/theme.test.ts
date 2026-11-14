import { describe, expect, it } from 'vitest'
import { nextTheme, readTheme } from './theme'

function storage(initial: Record<string, string> = {}) {
  const data = new Map(Object.entries(initial))
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) }
}

describe('theme', () => {
  it('defaults to light even when the phone is in dark mode', () => {
    expect(readTheme(storage())).toBe('light')
  })

  it('remembers the choice', () => {
    expect(readTheme(storage({ theme: 'dark' }))).toBe('dark')
    expect(readTheme(storage({ theme: 'whatever' }))).toBe('light')
  })

  it('toggles between light and dark', () => {
    expect(nextTheme('light')).toBe('dark')
    expect(nextTheme('dark')).toBe('light')
  })
})
