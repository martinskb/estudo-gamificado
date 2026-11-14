import { describe, expect, it } from 'vitest'
import type { TopicLight } from '../api/types'
import { lightFrames } from './lightAnimation'

const light = (over: Partial<TopicLight>): TopicLight => ({
  id: 1, title: 'Inglês', before: { level: 'Ouro', progress: 0.2 }, after: { level: 'Ouro', progress: 0.5 },
  level_up: false, max_level: false, ...over,
})

describe('lightFrames', () => {
  it('without level up the bar just fills from before to after', () => {
    expect(lightFrames(light({}))).toEqual([
      { at: 0, level: 'Ouro', progress: 0.2, burst: false },
      { at: 600, level: 'Ouro', progress: 0.5, burst: false },
    ])
  })

  it('on level up the bar fills to the end, bursts, then shows the new level', () => {
    const frames = lightFrames(light({ after: { level: 'Platina', progress: 0.05 }, level_up: true }))
    expect(frames).toEqual([
      { at: 0, level: 'Ouro', progress: 0.2, burst: false },
      { at: 600, level: 'Ouro', progress: 1, burst: false },
      { at: 1800, level: 'Platina', progress: 0, burst: true },
      { at: 2300, level: 'Platina', progress: 0.05, burst: false },
    ])
  })

  it('reaching the top ends full', () => {
    const frames = lightFrames(light({ after: { level: 'Diamante', progress: 1 }, level_up: true, max_level: true }))
    expect(frames.at(-1)).toEqual({ at: 2300, level: 'Diamante', progress: 1, burst: false })
  })
})
