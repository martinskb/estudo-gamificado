const DAY_MS = 86_400_000
const LABELS = ['S', 'T', 'Q', 'Q', 'S', 'S', 'D']

export type WeekDay = {
  date: string
  label: string
  today: boolean
  state: 'studied' | 'missed' | 'pending' | 'future'
}

/** Segunda a domingo da semana de `today` (datas AAAA-MM-DD, conta em UTC). */
export function weekStrip(today: string, studied: string[]): WeekDay[] {
  const set = new Set(studied)
  const todayMs = Date.parse(`${today}T00:00:00Z`)
  const monday = todayMs - ((new Date(todayMs).getUTCDay() + 6) % 7) * DAY_MS
  return LABELS.map((label, i) => {
    const ms = monday + i * DAY_MS
    const date = new Date(ms).toISOString().slice(0, 10)
    const state = set.has(date) ? 'studied' : ms > todayMs ? 'future' : ms === todayMs ? 'pending' : 'missed'
    return { date, label, today: ms === todayMs, state }
  })
}

type PartLike = { id: number; order: number; title: string; done: boolean }
export type Step<P extends PartLike> = P & { state: 'done' | 'current' | 'todo' }

/** Até 4 degraus em volta da próxima parte a estudar (a primeira não concluída). */
export function stepsAround<P extends PartLike>(parts: P[], size = 4): { next: P | null; steps: Step<P>[] } {
  const sorted = [...parts].sort((a, b) => a.order - b.order)
  const nextIndex = sorted.findIndex((p) => !p.done)
  const anchor = nextIndex === -1 ? sorted.length - 1 : nextIndex
  const end = Math.min(sorted.length, Math.max(anchor + 2, size))
  const start = Math.max(0, end - size)
  return {
    next: nextIndex === -1 ? null : sorted[nextIndex],
    steps: sorted.slice(start, end).map((p, i) => ({
      ...p,
      state: p.done ? 'done' : start + i === nextIndex ? 'current' : 'todo',
    })),
  }
}
