import { Link, useNavigate } from 'react-router-dom'
import { ConfirmButton } from '../ui/ConfirmButton'
import { Turntable } from '../vinyl/Vinyl'
import { GOAL_PRESETS } from './goal'
import { type useSession, clock } from './useSession'
import { type TimerState, activeSeconds, backOf, pause, resume } from './timerState'

export function GoalChips({ value, onChange }: { value: number; onChange: (m: number) => void }) {
  return (
    <div className="chips goal-chips" role="radiogroup" aria-label="Meta em minutos">
      {GOAL_PRESETS.map((m) => (
        <button
          type="button"
          key={m}
          role="radio"
          aria-checked={value === m}
          className={`chip${value === m ? ' selected' : ''}`}
          onClick={() => onChange(m)}
        >
          {m} min
        </button>
      ))}
    </div>
  )
}

type RunningProps = {
  session: ReturnType<typeof useSession>
  /** Linha acima do relógio (ex.: "Faixa 02 · Verbo to be"). */
  caption?: string
  /** Na trilha (ao lado das aulas): toca-discos reto, sem o cenário. */
  compact?: boolean
}

/** Sessão tocando: toca-discos, relógio e controles, dentro da própria tela. Concluir leva ao resumo. */
export function RunningSession({ session, caption, compact = false }: RunningProps) {
  const navigate = useNavigate()
  const { timer, now, set } = session
  if (!timer) return null
  const seconds = activeSeconds(timer, now)
  const goalSeconds = timer.goalMinutes * 60
  const paused = timer.pausedAt !== null
  const left = Math.max(0, Math.ceil((goalSeconds - seconds) / 60))
  const deck = { palette: timer.palette ?? 'noite', level: timer.level, playing: !paused, progress: seconds / goalSeconds }
  const status = paused ? 'Pausado' : seconds >= goalSeconds ? 'Meta cumprida!' : `Meta ${timer.goalMinutes} min · faltam ${left} min`

  return (
    <div className={`session${compact ? ' compact' : ''}`}>
      {compact ? (
        <Turntable key={timer.clientId} {...deck} className="session-deck" />
      ) : (
        // A sala: o toca-discos em cima da mesa, visto de cima em ângulo.
        <div className="stage" aria-hidden="true">
          <div className="stage-table" />
          <div className="stage-deck">
            <Turntable key={timer.clientId} {...deck} />
          </div>
        </div>
      )}
      <div className="session-readout">
        {caption && <span className="muted small">{caption}</span>}
        <strong className="session-clock" role="timer" aria-live="off">{clock(seconds)}</strong>
        <span className={`small session-status${paused || seconds >= goalSeconds ? ' lit' : ''}`}>{status}</span>
      </div>
      <div className="session-actions">
        <button className="btn soft grow" onClick={() => set(paused ? resume(timer, Date.now()) : pause(timer, Date.now()))}>
          {paused ? 'Retomar' : 'Pausar'}
        </button>
        <button
          className="btn primary grow"
          onClick={() => {
            set(pause(timer, Date.now()))
            navigate('/concluir')
          }}
        >
          Concluir
        </button>
      </div>
      <ConfirmButton
        label="Descartar"
        className="btn ghost small"
        confirmLabel={`Descartar ${Math.floor(seconds / 60)} min?`}
        skipConfirm={seconds < 60}
        onConfirm={() => set(null)}
      />
    </div>
  )
}

/** Outra sessão já está rodando: aponta para onde ela está (ou, na mesma tela, chama `onOpen`). */
export function OtherSession({ timer, onOpen }: { timer: TimerState; onOpen?: () => void }) {
  if (onOpen) {
    return (
      <button className="btn soft block" onClick={onOpen}>
        <span className="truncate">Sessão em andamento: {timer.topic}</span>
      </button>
    )
  }
  return (
    <Link className="btn soft block" to={backOf(timer)}>
      <span className="truncate">Sessão em andamento: {timer.topic}</span>
    </Link>
  )
}
