import { type FormEvent, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { post } from '../api/client'
import type { Progress, Topic } from '../api/types'
import { useApi } from '../api/useApi'
import { Logo } from '../brand/Logo'
import { todayBelem } from '../progress/calendarGrid'
import { Cover } from '../topics/Cover'
import { formatHours } from '../topics/cover'
import { GallerySkeleton } from '../ui/Skeleton'
import { weekStrip } from './homeModel'

const SORTS = [
  { value: 'recent', label: 'Recentes' },
  { value: 'time', label: 'Mais tempo' },
  { value: 'done', label: 'Concluídos' },
] as const

const lastLabel = (iso: string | null) => {
  if (!iso) return 'ainda sem sessões'
  const days = Math.round((Date.parse(`${todayBelem()}T00:00:00Z`) - Date.parse(`${iso}T00:00:00Z`)) / 86_400_000)
  return days <= 0 ? 'hoje' : days === 1 ? 'ontem' : `há ${days} dias`
}

export function HomePage() {
  const navigate = useNavigate()
  const { data: p, error, reload } = useApi<Progress>('/progress')
  const [sort, setSort] = useState<(typeof SORTS)[number]['value']>('recent')
  const { data: topics } = useApi<Topic[]>(`/topics?sort=${sort}`)
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [addError, setAddError] = useState('')

  async function addTopic(e: FormEvent) {
    e.preventDefault()
    setBusy(true)
    setAddError('')
    try {
      const t = await post<Topic>('/topics', { title: title.trim() })
      navigate(`/tema/${t.id}`)
    } catch (err) {
      setAddError(err instanceof Error ? err.message : 'Não deu para criar o tema.')
      setBusy(false)
    }
  }

  const empty = topics !== null && topics.length === 0 && sort === 'recent'

  return (
    <main className="shell">
      <div className="home-head">
        <span className="home-logo"><Logo size={30} /></span>
        {p && (
          <span className="row" style={{ gap: 'var(--space-2)' }}>
            {p.freezes > 0 && (
              <span className="pill soft" title="Usada sozinha se você perder um dia">Proteção ×{p.freezes}</span>
            )}
            <span className="pill highlight" title="Dias seguidos">{p.streak} {p.streak === 1 ? 'dia' : 'dias'}</span>
          </span>
        )}
      </div>

      {error && (
        <div className="notice warn stack">
          <p>{error}</p>
          <button className="btn small" onClick={reload}>Tentar de novo</button>
        </div>
      )}

      {p && !p.studied_today && p.streak > 0 && (
        <p className="notice warn" role="status">
          Você ainda não focou hoje: sua ofensiva de {p.streak} {p.streak === 1 ? 'dia' : 'dias'} está em risco.
        </p>
      )}

      <div className="columns home-columns">
        <section className="stack" style={{ gap: 'var(--space-4)' }} aria-label="Aprendendo">
          <div className="section-title">
            <h2 style={{ fontSize: '1.25rem' }}>Aprendendo</h2>
            {!empty && (
              <button className="btn soft small" onClick={() => setAdding((a) => !a)} aria-expanded={adding}>
                + Novo tema
              </button>
            )}
          </div>

          {(adding || empty) && (
            <form className="card stack" style={{ gap: 'var(--space-3)' }} onSubmit={addTopic}>
              <label>
                {empty ? 'O que você quer aprender? Comece pelo primeiro tema.' : 'Quero aprender…'}
                <input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  maxLength={80}
                  placeholder="ex.: Inglês, Cálculo I, Cronologia da Marvel"
                  autoFocus={adding}
                />
              </label>
              {addError && <p className="error" role="alert">{addError}</p>}
              <button className="btn primary block" disabled={!title.trim() || busy}>
                {busy ? 'Criando…' : 'Criar tema'}
              </button>
            </form>
          )}

          {!empty && (
            <div className="segmented compact" role="tablist" aria-label="Ordenar">
              {SORTS.map((s) => (
                <button
                  key={s.value}
                  role="tab"
                  aria-selected={sort === s.value}
                  onClick={() => setSort(s.value)}
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {topics === null && <GallerySkeleton />}
          {topics && topics.length === 0 && sort === 'done' && (
            <p className="muted">Quando você marcar um tema como concluído, ele aparece aqui.</p>
          )}
          {topics && topics.length > 0 && (
            <div className="gallery">
              {topics.map((t) => (
                <Link key={t.id} className="gallery-item" to={`/tema/${t.id}`}>
                  <Cover topic={t} />
                  <span className="gallery-meta">
                    <strong>{t.title}</strong>
                    <span>{formatHours(t.total_seconds)} · {lastLabel(t.last_day)}</span>
                  </span>
                </Link>
              ))}
              {sort !== 'done' && (
                <button className="gallery-add" onClick={() => setAdding(true)} aria-label="Novo tema">
                  <b aria-hidden="true">+</b>
                  Novo tema
                </button>
              )}
            </div>
          )}
        </section>

        {p && (
          <div>
            <section className="card stack" style={{ gap: 'var(--space-4)' }} aria-label="Esta semana">
              <div className="section-title">
                <h2>Esta semana</h2>
                <span className="muted">{p.week_days} de {p.week_goal_days} dias</span>
              </div>
              <div className="week-strip">
                {weekStrip(todayBelem(), p.studied_days).map((d) => (
                  <span key={d.date} className={`${d.state}${d.today ? ' is-today' : ''}`}>
                    <i aria-hidden="true" />
                    <span>{d.label}</span>
                  </span>
                ))}
              </div>
            </section>
            <section className="card stack" style={{ gap: 'var(--space-4)' }} aria-label="Seus números">
              <div className="mini-stats">
                <div><span className="stat" style={{ color: 'var(--accent)' }}>{p.streak}</span><span className="muted small">dias seguidos</span></div>
                <div><span className="stat">{p.week_points}</span><span className="muted small">pontos na semana</span></div>
                <div><span className="stat">{p.freezes}</span><span className="muted small">proteções</span></div>
              </div>
              <Link className="btn ghost small" style={{ alignSelf: 'flex-start', paddingLeft: 0 }} to="/progresso">Ver progresso completo →</Link>
            </section>
            <Link className="btn ghost block" to="/estudar">Cronômetro livre</Link>
          </div>
        )}
      </div>
    </main>
  )
}
