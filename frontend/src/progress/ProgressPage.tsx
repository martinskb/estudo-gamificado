import { useState } from 'react'
import { put } from '../api/client'
import type { Progress, SessionRow } from '../api/types'
import { useApi } from '../api/useApi'
import { TrailList } from '../trails/TrailList'
import { Calendar } from './Calendar'

const dayLabel = (iso: string) => iso.split('-').reverse().slice(0, 2).join('/')
const minutesLabel = (seconds: number) => `${Math.floor(seconds / 60)} min`

export function ProgressPage() {
  const { data: p, error, reload, setData } = useApi<Progress>('/progress')
  const { data: sessions } = useApi<SessionRow[]>('/sessions')
  const [topic, setTopic] = useState('')
  const [goalError, setGoalError] = useState('')

  async function changeGoal(days: number) {
    if (!p) return
    const previous = p.week_goal_days
    setData({ ...p, week_goal_days: days })
    setGoalError('')
    try {
      await put('/me/settings', { week_goal_days: days })
    } catch {
      setData({ ...p, week_goal_days: previous })
      setGoalError('Não deu para salvar a meta. Tente de novo.')
    }
  }

  if (error) {
    return (
      <main className="shell">
        <h1>Progresso</h1>
        <div className="notice warn stack">
          <p>{error}</p>
          <button className="btn" onClick={reload}>Tentar de novo</button>
        </div>
      </main>
    )
  }
  if (!p) return <main className="shell"><h1>Progresso</h1><p className="muted">Carregando…</p></main>

  const maxMinutes = Math.max(1, ...p.minutes_by_topic.map((t) => t.minutes))
  const topics = p.minutes_by_topic.map((t) => t.topic)
  const shown = (sessions ?? []).filter((s) => !topic || s.topic === topic)

  return (
    <main className="shell">
      <h1>Progresso</h1>

      <section className="stat-grid">
        <div className="card"><div className="stat">{p.streak}</div><span className="muted small">dias de ofensiva</span></div>
        <div className="card"><div className="stat">{p.freezes}</div><span className="muted small">proteções guardadas</span></div>
        <div className="card"><div className="stat">{p.week_points}</div><span className="muted small">pontos na semana</span></div>
        <div className="card"><div className="stat">{p.total_points}</div><span className="muted small">pontos no total</span></div>
      </section>

      <section className="card stack" aria-label="Dias estudados">
        <h2>Dias estudados</h2>
        <Calendar studied={p.studied_days} saved={p.saved_days} />
      </section>

      <section className="card stack" aria-label="Meta da semana">
        <div className="row spread">
          <h2>Meta da semana</h2>
          <span className="muted">{p.week_days} de {p.week_goal_days} dias</span>
        </div>
        <div className="bar" aria-hidden>
          <span style={{ width: `${Math.min(100, (p.week_days / p.week_goal_days) * 100)}%` }} />
        </div>
        <label>
          Quantos dias por semana você quer estudar?
          <select value={p.week_goal_days} onChange={(e) => changeGoal(Number(e.target.value))}>
            {[1, 2, 3, 4, 5, 6, 7].map((n) => (
              <option key={n} value={n}>{n} {n === 1 ? 'dia' : 'dias'}</option>
            ))}
          </select>
        </label>
        {goalError && <p className="error" role="alert">{goalError}</p>}
      </section>

      <section className="card stack" aria-label="Tempo por tema">
        <h2>Tempo por tema</h2>
        {p.minutes_by_topic.length === 0 && (
          <p className="muted">Conclua uma sessão para ver seu tempo por tema aqui.</p>
        )}
        {p.minutes_by_topic.map((t) => (
          <div className="topic-bar" key={t.topic}>
            <span className="truncate">{t.topic}</span>
            <strong>{t.minutes} min</strong>
            <div className="bar" aria-hidden><span style={{ width: `${(t.minutes / maxMinutes) * 100}%` }} /></div>
          </div>
        ))}
      </section>

      {p.trails.length > 0 && (
        <section className="stack" aria-label="Trilhas">
          <h2>Trilhas</h2>
          <TrailList trails={p.trails} />
        </section>
      )}

      <section className="card stack" aria-label="Histórico">
        <div className="row spread wrap">
          <h2>Histórico</h2>
          {topics.length > 1 && (
            <select
              aria-label="Filtrar por tema"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              style={{ width: 'auto', minHeight: 40 }}
            >
              <option value="">Todos os temas</option>
              {topics.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          )}
        </div>
        {sessions && shown.length === 0 && <p className="muted">Nenhuma sessão ainda.</p>}
        <ul className="list">
          {shown.map((s) => (
            <li key={s.id} className="stack" style={{ gap: 'var(--space-1)' }}>
              <div className="row spread">
                <strong className="truncate">{s.topic}</strong>
                <span className="muted small">{dayLabel(s.day)}</span>
              </div>
              <div className="row wrap small muted">
                <span>{minutesLabel(s.active_seconds)} de {s.goal_minutes} min</span>
                {s.goal_met && <span className="pill">Meta cumprida</span>}
                {s.points > 0 && <span className="pill">+{s.points} pts</span>}
              </div>
              {s.note && <p className="small">{s.note}</p>}
            </li>
          ))}
        </ul>
      </section>
    </main>
  )
}
