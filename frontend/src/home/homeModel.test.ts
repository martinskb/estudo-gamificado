import { describe, expect, it } from 'vitest'
import { stepsAround, weekStrip } from './homeModel'

describe('weekStrip', () => {
  // 2026-11-12 é quinta-feira
  it('lists monday to sunday of the current week with studied/today/future flags', () => {
    const week = weekStrip('2026-11-12', ['2026-11-09', '2026-11-10', '2026-11-12', '2026-11-08'])
    expect(week.map((d) => d.label)).toEqual(['S', 'T', 'Q', 'Q', 'S', 'S', 'D'])
    expect(week.map((d) => d.state)).toEqual(['studied', 'studied', 'missed', 'studied', 'future', 'future', 'future'])
    expect(week[3].today).toBe(true)
  })

  it('today without study is pending, not missed', () => {
    expect(weekStrip('2026-11-12', [])[3].state).toBe('pending')
  })
})

describe('stepsAround', () => {
  const parts = [1, 2, 3, 4, 5, 6].map((n) => ({ id: n, order: n, title: `P${n}`, done: n <= 4 }))

  it('shows up to 4 steps ending just after the next one to study', () => {
    const r = stepsAround(parts)
    expect(r.next?.order).toBe(5)
    expect(r.steps.map((s) => [s.order, s.state])).toEqual([
      [3, 'done'], [4, 'done'], [5, 'current'], [6, 'todo'],
    ])
  })

  it('starts at the beginning for a new trail', () => {
    const fresh = parts.map((p) => ({ ...p, done: false }))
    expect(stepsAround(fresh).steps.map((s) => s.order)).toEqual([1, 2, 3, 4])
  })

  it('a finished trail has no next step', () => {
    const r = stepsAround(parts.map((p) => ({ ...p, done: true })))
    expect(r.next).toBeNull()
    expect(r.steps.map((s) => s.order)).toEqual([3, 4, 5, 6])
  })
})
