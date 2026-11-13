export type DayState = 'studied' | 'saved' | 'empty' | 'future'
export type DayCell = { date: string; state: DayState }

const DAY_MS = 86_400_000

// Datas são "AAAA-MM-DD" e a conta é feita em UTC para não escorregar com fuso/horário de verão.
const parse = (iso: string) => Date.parse(`${iso}T00:00:00Z`)
const format = (ms: number) => new Date(ms).toISOString().slice(0, 10)

/** Colunas = semanas (segunda a domingo), a última é a semana de `today`. */
export function buildCalendar(
  today: string,
  weeks: number,
  studied: string[],
  saved: string[],
): DayCell[][] {
  const studiedSet = new Set(studied)
  const savedSet = new Set(saved)
  const todayMs = parse(today)
  const weekday = (new Date(todayMs).getUTCDay() + 6) % 7 // segunda = 0
  const firstMonday = todayMs - weekday * DAY_MS - (weeks - 1) * 7 * DAY_MS

  return Array.from({ length: weeks }, (_, w) =>
    Array.from({ length: 7 }, (_, d) => {
      const ms = firstMonday + (w * 7 + d) * DAY_MS
      const date = format(ms)
      const state: DayState =
        ms > todayMs ? 'future' : studiedSet.has(date) ? 'studied' : savedSet.has(date) ? 'saved' : 'empty'
      return { date, state }
    }),
  )
}

/** Hoje em Belém, no formato AAAA-MM-DD. */
export function todayBelem(now: Date = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Belem' }).format(now)
}
