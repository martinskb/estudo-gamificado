import { Link, useNavigate } from 'react-router-dom'
import { AssistantPanel } from '../assistant/AssistantPanel'
import { ConfirmButton } from '../ui/ConfirmButton'
import { GOAL_PRESETS } from './goal'
import { type useSession, clock } from './useSession'
import { type TimerState, activeSeconds, backOf, pause, resume } from './timerState'

export function GoalChips({ value, onChange }: { value: number; onChange: (m: number) => void }) {
  return (
    <div className="chips" role="radiogroup" aria-label="Meta em minutos">
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

/** Cronômetro em andamento, dentro da própria tela. Concluir leva ao resumo; o resto não sai daqui. */
export function RunningSession({ session, assistant = true }: { session: ReturnType<typeof useSession>; assistant?: boolean }) {
  const navigate = useNavigate()
  const { timer, now, set } = session
  if (!timer) return null
  const seconds = activeSeconds(timer, now)
  const goalSeconds = timer.goalMinutes * 60
  const paused = timer.pausedAt !== null

  return (
    <div className="session stack">
      <div className="row spread">
        <span className="muted small">
          {paused ? 'Pausado' : seconds >= goalSeconds ? 'Meta cumprida!' : `Meta: ${timer.goalMinutes} min`}
        </span>
        <strong className="session-clock" role="timer" aria-live="off">{clock(seconds)}</strong>
      </div>
      <div className="bar" aria-hidden><span style={{ width: `${Math.min(100, (seconds / goalSeconds) * 100)}%` }} /></div>
      <div className="row" style={{ gap: 'var(--space-2)' }}>
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
      {assistant && <AssistantPanel topic={timer.topic} />}
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
