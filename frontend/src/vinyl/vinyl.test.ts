import { describe, expect, it } from 'vitest'
import { ARM_END, ARM_REST, ARM_START, armAngle, finishOf } from './vinyl'

describe('disc finish', () => {
  it('follows the topic level', () => {
    expect(finishOf('Ouro')).toBe('ouro')
    expect(finishOf('Diamante')).toBe('diamante')
  })
  it('falls back to plain vinyl', () => {
    expect(finishOf(undefined)).toBe('vinil')
    expect(finishOf('Farol')).toBe('vinil')
  })
})

describe('tonearm', () => {
  it('rests off the record when paused', () => {
    expect(armAngle(0.5, false)).toBe(ARM_REST)
  })
  it('travels from the edge to the label as the goal fills', () => {
    expect(armAngle(0, true)).toBe(ARM_START)
    expect(armAngle(0.5, true)).toBe((ARM_START + ARM_END) / 2)
    expect(armAngle(1, true)).toBe(ARM_END)
  })
  it('stays on the label after the goal', () => {
    expect(armAngle(1.7, true)).toBe(ARM_END)
  })
})
