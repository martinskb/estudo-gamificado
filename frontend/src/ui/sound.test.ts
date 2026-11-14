import { describe, expect, it } from 'vitest'
import { avatarPalette, initial } from './avatar'
import { createSoundSetting } from './sound'

function memory(initialValue?: string) {
  const data = new Map<string, string>(initialValue ? [['sound', initialValue]] : [])
  return { getItem: (k: string) => data.get(k) ?? null, setItem: (k: string, v: string) => void data.set(k, v) }
}

describe('sound setting', () => {
  it('is on by default and remembers when turned off', () => {
    const store = memory()
    const s = createSoundSetting(store)
    expect(s.enabled()).toBe(true)
    s.set(false)
    expect(createSoundSetting(store).enabled()).toBe(false)
    expect(createSoundSetting(memory('off')).enabled()).toBe(false)
  })
})

describe('avatar', () => {
  it('uses the first letter, uppercased, ignoring underscores and digits at the start', () => {
    expect(initial('beater')).toBe('B')
    expect(initial('_ana')).toBe('A')
    expect(initial('42joao')).toBe('J')
    expect(initial('123')).toBe('1')
  })

  it('always gives the same palette to the same nickname, ignoring case', () => {
    expect(avatarPalette('Beater')).toEqual(avatarPalette('beater'))
    expect(avatarPalette('Beater')).toHaveProperty('dark')
  })
})
