import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { playSound } from '../ui/sound'
import type { Conclusion } from '../api/types'

type Props = { result: Conclusion; minutes: number; backTo: string; backLabel: string }

/** Conta de `from` até `to` em ~0,9 s (salta direto se a pessoa prefere menos movimento). */
function useCountUp(from: number, to: number): number {
  const [value, setValue] = useState(from)
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || from === to) {
      setValue(to)
      return
    }
    let frame = 0
    const start = performance.now() + 350
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start) / 900))
      const eased = 1 - Math.pow(1 - t, 3)
      setValue(Math.round(from + (to - from) * eased))
      if (t < 1) frame = requestAnimationFrame(tick)
    }
    frame = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(frame)
  }, [from, to])
  return value
}

export function Celebration({ result, minutes, backTo, backLabel }: Props) {
  const grew = result.streak_after > result.streak_before
  const shown = useCountUp(result.streak_before, result.streak_after)
  useEffect(() => {
    const id = setTimeout(() => playSound(grew ? 'streak' : 'complete'), 300)
    return () => clearTimeout(id)
  }, [grew])
  return (
    <main className="shell narrow center" style={{ justifyContent: 'center' }}>
      <div className="stack center pop">
        <p className="muted">{grew ? 'Ofensiva estendida!' : 'Sessão concluída'}</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          {grew && <span className="big-number muted">{result.streak_before}</span>}
          {grew && <span className="big-number muted" aria-hidden>→</span>}
          <span className="big-number" style={{ color: 'var(--accent)' }}>
            {shown}
          </span>
        </div>
        <p>{result.streak_after === 1 ? 'dia seguido' : 'dias seguidos'}</p>
      </div>
      <div className="card stack" style={{ width: '100%' }}>
        <div className="row spread"><span>Tempo estudado</span><strong>{minutes} min</strong></div>
        <div className="row spread">
          <span>Pontos</span>
          <strong>{result.points > 0 ? `+${result.points}` : '0'}</strong>
        </div>
        {result.points === 0 && (
          <p className="muted small">
            Sessões de 20 min ou mais valem pontos. Esta ficou registrada do mesmo
            jeito.
          </p>
        )}
        <div className="row spread">
          <span>Meta da sessão</span>
          <strong>{result.goal_met ? 'Cumprida!' : 'Não foi dessa vez'}</strong>
        </div>
      </div>
      <Link className="btn primary block" to={backTo}>{backLabel}</Link>
    </main>
  )
}
