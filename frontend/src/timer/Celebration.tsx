import { Link } from 'react-router-dom'
import type { Conclusion } from '../api/types'

type Props = { result: Conclusion; minutes: number; backTo: string; backLabel: string }

export function Celebration({ result, minutes, backTo, backLabel }: Props) {
  const grew = result.streak_after > result.streak_before
  return (
    <main className="shell center" style={{ justifyContent: 'center' }}>
      <div className="stack center pop">
        <p className="muted">{grew ? 'Ofensiva estendida!' : 'Sessão concluída'}</p>
        <div className="row" style={{ justifyContent: 'center' }}>
          {grew && <span className="big-number muted">{result.streak_before}</span>}
          {grew && <span className="big-number muted" aria-hidden>→</span>}
          <span className="big-number" style={{ color: 'var(--accent)' }}>
            {result.streak_after}
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
            Pontuam sessões de 20 min ou mais, até 3 por dia. A sessão ficou registrada do mesmo
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
