import { describe, expect, it } from 'vitest'
import { PALETTES, centerSquare, duotoneTables, formatHours } from './cover'

describe('centerSquare', () => {
  it('crops the middle of a landscape photo', () => {
    expect(centerSquare(4000, 3000)).toEqual({ sx: 500, sy: 0, size: 3000 })
  })
  it('crops the middle of a portrait photo', () => {
    expect(centerSquare(1080, 1920)).toEqual({ sx: 0, sy: 420, size: 1080 })
  })
})

describe('palettes', () => {
  it('has the six palettes the server accepts, each with dark and light', () => {
    expect(Object.keys(PALETTES)).toEqual(['indigo', 'noite', 'lilas', 'coral', 'verde', 'sol'])
    for (const p of Object.values(PALETTES)) {
      expect(p.dark).toMatch(/^#/)
      expect(p.light).toMatch(/^#/)
    }
  })
})

describe('formatHours', () => {
  it('shows minutes under an hour and hours with minutes above', () => {
    expect(formatHours(0)).toBe('0 min')
    expect(formatHours(25 * 60)).toBe('25 min')
    expect(formatHours(3600)).toBe('1 h')
    expect(formatHours(14 * 3600 + 20 * 60)).toBe('14 h 20')
  })
})

describe('duotone tables', () => {
  it('maps black to the dark color and white to the light color, channel by channel', () => {
    expect(duotoneTables('#2a2890', '#ffd43b')).toEqual({
      r: '0.1647 1',
      g: '0.1569 0.8314',
      b: '0.5647 0.2314',
    })
  })
})
