import { describe, expect, it } from 'vitest'
import { shouldSignalGoal } from './goalSignal'
import { pause, startTimer } from './timerState'

const T0 = Date.UTC(2026, 10, 14, 12)
const min = (m: number) => T0 + m * 60_000
const memory = () => {
  const m = new Map<string, string>()
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v) }
}

describe('goal signal', () => {
  it('stays quiet before the goal', () => {
    expect(shouldSignalGoal(startTimer('Física', 25, null, T0), min(24), memory())).toBe(false)
  })

  it('fires once when the goal is reached, even after a reload', () => {
    const t = startTimer('Física', 25, null, T0)
    const store = memory()
    expect(shouldSignalGoal(t, min(25), store)).toBe(true)
    expect(shouldSignalGoal(t, min(26), store)).toBe(false)
  })

  it('does not fire while paused', () => {
    const t = pause(startTimer('Física', 25, null, T0), min(30))
    expect(shouldSignalGoal(t, min(31), memory())).toBe(false)
  })
})
