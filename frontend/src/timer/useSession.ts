import { useEffect, useState } from 'react'
import { player } from '../local/studyMusic'
import type { PaletteName } from '../topics/cover'
import { type TimerState, loadTimer, saveTimer, startTimer } from './timerState'

export function clock(total: number): string {
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

type Origin = {
  topic: string
  back: string
  partId?: number | null
  topicId?: number | null
  palette?: PaletteName
  level?: string
}

/** Sessão de estudo ligada a uma tela (tema ou parte da trilha): começa, pausa e descarta ali mesmo. */
export function useSession({ topic, back, partId = null, topicId = null, palette, level }: Origin) {
  const [timer, setTimerState] = useState<TimerState | null>(() => loadTimer())
  const [now, setNow] = useState(() => Date.now())
  const mine = timer !== null && (partId !== null ? timer.partId === partId : timer.topicId === topicId && !timer.partId)

  useEffect(() => {
    if (!mine) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    const onVisible = () => setNow(Date.now())
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [mine])

  function set(next: TimerState | null) {
    // Dentro do toque da pessoa: é o que deixa o navegador começar a música.
    player.sync(next !== null && next.pausedAt === null)
    saveTimer(next)
    setTimerState(next)
    setNow(Date.now())
  }

  return {
    timer,
    now,
    mine,
    other: timer !== null && !mine ? timer : null,
    start: (goal: number) => set({ ...startTimer(topic, goal, partId, Date.now(), topicId, back), palette, level }),
    set,
  }
}
