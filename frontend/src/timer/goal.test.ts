import { describe, expect, it } from 'vitest'
import { parseGoal } from './goal'

describe('parseGoal', () => {
  it('accepts whole minutes from 1 to 600', () => {
    expect(parseGoal('25')).toBe(25)
    expect(parseGoal(' 90 ')).toBe(90)
    expect(parseGoal('1')).toBe(1)
    expect(parseGoal('600')).toBe(600)
  })

  it('returns null while the field is empty or invalid, instead of forcing a value', () => {
    expect(parseGoal('')).toBeNull()
    expect(parseGoal('0')).toBeNull()
    expect(parseGoal('601')).toBeNull()
    expect(parseGoal('2,5')).toBeNull()
    expect(parseGoal('abc')).toBeNull()
  })
})
