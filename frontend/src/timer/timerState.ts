// O cronômetro guarda horários, não uma contagem: o navegador do celular congela a
// aba quando a tela apaga, então o tempo é sempre recalculado a partir do início.

export type TimerState = {
  clientId: string
  topic: string
  partId: number | null
  topicId?: number | null
  /** Tela de onde a sessão começou (trilha ou tema): os controles ficam lá. */
  back?: string
  goalMinutes: number
  startedAt: number
  pausedAt: number | null
  pausedMs: number
}

const KEY = 'timer:v1'

export function startTimer(
  topic: string,
  goalMinutes: number,
  partId: number | null,
  now: number,
  topicId: number | null = null,
  back = '/',
): TimerState {
  return {
    clientId: crypto.randomUUID(),
    topic,
    partId,
    topicId,
    back,
    goalMinutes,
    startedAt: now,
    pausedAt: null,
    pausedMs: 0,
  }
}

export function pause(s: TimerState, now: number): TimerState {
  return s.pausedAt === null ? { ...s, pausedAt: now } : s
}

export function resume(s: TimerState, now: number): TimerState {
  if (s.pausedAt === null) return s
  return { ...s, pausedAt: null, pausedMs: s.pausedMs + (now - s.pausedAt) }
}

export function activeSeconds(s: TimerState, now: number): number {
  const end = s.pausedAt ?? now
  return Math.max(0, Math.floor((end - s.startedAt - s.pausedMs) / 1000))
}

export function saveTimer(s: TimerState | null, storage: Storage = localStorage): void {
  try {
    if (s === null) storage.removeItem(KEY)
    else storage.setItem(KEY, JSON.stringify(s))
  } catch {
    // armazenamento bloqueado (aba anônima): o cronômetro segue só em memória
  }
}

export function loadTimer(storage: Storage = localStorage): TimerState | null {
  try {
    const raw = storage.getItem(KEY)
    if (!raw) return null
    const s = JSON.parse(raw)
    return typeof s?.startedAt === 'number' && typeof s?.clientId === 'string' ? s : null
  } catch {
    return null
  }
}

/** Onde ficam os controles: a tela que começou a sessão. Sessões antigas (sem `back`) vão direto ao resumo. */
export function backOf(s: TimerState): string {
  return s.back ?? '/concluir'
}
