import { describe, expect, it } from 'vitest'
import { buildCalendar } from './calendarGrid'

describe('buildCalendar', () => {
  // 2026-11-12 é uma quinta-feira
  const grid = buildCalendar('2026-11-12', 3, ['2026-11-09', '2026-11-12'], ['2026-11-10'])

  it('has one column per week, monday to sunday', () => {
    expect(grid).toHaveLength(3)
    expect(grid.every((week) => week.length === 7)).toBe(true)
    expect(grid[2][0].date).toBe('2026-11-09')
    expect(grid[2][6].date).toBe('2026-11-15')
    expect(grid[0][0].date).toBe('2026-10-26')
  })

  it('marks studied, saved, empty and future days', () => {
    const week = grid[2].map((c) => c.state)
    expect(week).toEqual(['studied', 'saved', 'empty', 'studied', 'future', 'future', 'future'])
  })

  it('crosses month boundaries without skipping days', () => {
    const dates = grid.flat().map((c) => c.date)
    expect(dates).toContain('2026-10-31')
    expect(dates).toContain('2026-11-01')
    expect(new Set(dates).size).toBe(21)
  })
})
