import type { TopicLight } from '../api/types'

export type LightFrame = { at: number; level: string; progress: number; burst: boolean }

/** Quadros da animação da luz do tema na comemoração (tempos em ms). */
export function lightFrames(light: TopicLight): LightFrame[] {
  const start = { at: 0, level: light.before.level, progress: light.before.progress, burst: false }
  if (!light.level_up) return [start, { at: 600, level: light.after.level, progress: light.after.progress, burst: false }]
  return [
    start,
    { at: 600, level: light.before.level, progress: 1, burst: false },
    { at: 1800, level: light.after.level, progress: 0, burst: true },
    { at: 2300, level: light.after.level, progress: light.after.progress, burst: false },
  ]
}

export const LEVEL_ORDER = ['Acendendo', 'Faísca', 'Chama', 'Lanterna', 'Farol']
