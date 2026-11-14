import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { post } from '../api/client'
import type { Progress, Topic } from '../api/types'
import { useApi } from '../api/useApi'
import { useAdoptServerCovers } from '../local/covers'
import { Logo } from '../brand/Logo'
import { todayBelem } from '../progress/calendarGrid'
import { activeSeconds, backOf, loadTimer } from '../timer/timerState'
import { clock } from '../timer/useSession'
import { Sleeve } from '../topics/Cover'
import { formatHours } from '../topics/cover'
import { ShelfSkeleton } from '../ui/Skeleton'
import { Turntable } from '../vinyl/Vinyl'
import { weekStrip } from './homeModel'

const lastLabel = (iso: string | null) => {
  if (!iso) return 'ainda sem sessões'
  const days = Math.round((Date.parse(`${todayBelem()}T00:00:00Z`) - Date.parse(`${iso}T00:00:00Z`)) / 86_400_000)
  return days <= 0 ? 'hoje' : days === 1 ? 'ontem' : `há ${days} dias`
}

export function HomePage() {
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const { data: p, error, reload } = useApi<Progress>('/progress')
  const { data: topics } = useApi<Topic[]>('/topics?sort=recent')
  useAdoptServerCovers(topics)
  const learning = topics && topics.filter((t) => !t.done)
  const done = topics && topics.filter((t) => t.done)
  const [adding, setAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [busy, setBusy] = useState(false)
  const [addError, setAddError] = useState('')

  // O botão "+" do meio da barra (celular) abre o campo de novo tema aqui (/?novo=1).
  const wantsNew = params.get('novo') === '1'

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

  const empty = learning !== null && learning.length === 0
  const showForm = adding || wantsNew || empty

  return (
    <main className="shell shelf-page">
      <div className="home-head">
        <span className="home-logo"><Logo size={28} /></span>
        {p && (
          <span className="row" style={{ gap: 'var(--space-2)' }}>
            {p.freezes > 0 && (
              <span className="pill soft" title="Usada sozinha se você perder um dia">Proteção ×{p.freezes}</span>
            )}
            <span className="pill streak" title="Dias seguidos">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M12 3c1 4 5 5.5 5 10a5 5 0 0 1-10 0c0-2.5 1.5-4 2.5-5 .3 2 1.3 3 2.5 3 0-3-1.5-5.5 0-8z" />
              </svg>
              {p.streak} {p.streak === 1 ? 'dia' : 'dias'}
            </span>
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

      <div className="home-layout">
        <Stage topics={learning} />

        <div className="home-shelves">
          <section className="shelf" aria-label="Aprendendo">
            <div className="section-title">
              <h1 className="shelf-title">Aprendendo</h1>
              {!empty && (
                <button
                  className="btn soft small"
                  onClick={() => {
                    setAdding(!showForm)
                    if (wantsNew) setParams({}, { replace: true })
                  }}
                  aria-expanded={showForm}
                >
                  + Novo disco
                </button>
              )}
            </div>

            {showForm && (
              <form className="card stack" style={{ gap: 'var(--space-3)' }} onSubmit={addTopic}>
                <label>
                  {empty ? 'O que você quer aprender? Comece pelo primeiro disco.' : 'Quero aprender…'}
                  <input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    maxLength={80}
                    placeholder="ex.: Inglês, Cálculo I, Cronologia da Marvel"
                    autoFocus={adding || wantsNew}
                  />
                </label>
                {addError && <p className="error" role="alert">{addError}</p>}
                <button className="btn primary block" disabled={!title.trim() || busy}>
                  {busy ? 'Criando…' : 'Criar tema'}
                </button>
              </form>
            )}

            {learning === null && <ShelfSkeleton />}
            {learning && learning.length > 0 && (
              <div className="shelf-row">
                <div className="shelf-items">
                  {learning.map((t) => (
                    <Link key={t.id} className="shelf-item" to={`/tema/${t.id}`}>
                      <Sleeve topic={t} />
                      <span className="shelf-meta">
                        <strong>{t.title}</strong>
                        <span>{formatHours(t.total_seconds)} · {lastLabel(t.last_day)}</span>
                      </span>
                    </Link>
                  ))}
                </div>
                <i className="shelf-plank" aria-hidden="true" />
              </div>
            )}
          </section>

          {done && done.length > 0 && (
            <section className="shelf small" aria-label="Concluídos">
              <h2 className="shelf-title">Concluídos</h2>
              <div className="shelf-row">
                <div className="shelf-items">
                  {done.map((t) => (
                    <Link key={t.id} className="shelf-item" to={`/tema/${t.id}`} aria-label={`${t.title}, disco ${t.level.name.toLowerCase()}`}>
                      <Sleeve topic={t} />
                    </Link>
                  ))}
                </div>
                <i className="shelf-plank" aria-hidden="true" />
              </div>
            </section>
          )}

          {p && (
            <section className="card stack week-card" style={{ gap: 'var(--space-3)' }} aria-label="Esta semana">
              <div className="section-title">
                <strong>Esta semana</strong>
                <span className="muted small">{p.week_days} de {p.week_goal_days} dias</span>
              </div>
              <div className="week-strip">
                {weekStrip(todayBelem(), p.studied_days).map((d) => (
                  <span key={d.date} className={`${d.state}${d.today ? ' is-today' : ''}`}>
                    <i aria-hidden="true" />
                    <span>{d.label}</span>
                  </span>
                ))}
              </div>
              <Link className="muted small" to="/progresso" style={{ fontWeight: 600 }}>
                {p.week_points} pontos na semana · ver progresso →
              </Link>
            </section>
          )}
        </div>
      </div>
    </main>
  )
}

/** No computador: o toca-discos à esquerda da estante, tocando a sessão em andamento. */
function Stage({ topics }: { topics: Topic[] | null }) {
  const [now, setNow] = useState(() => Date.now())
  const timer = loadTimer()
  useEffect(() => {
    if (!timer) return
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [timer])

  const fallback = topics?.[0]
  const playing = timer !== null && timer.pausedAt === null
  const seconds = timer ? activeSeconds(timer, now) : 0
  const progress = timer ? seconds / (timer.goalMinutes * 60) : 0
  const palette = timer?.palette ?? fallback?.palette ?? 'noite'
  const level = timer?.level ?? fallback?.level.name

  return (
    <aside className="home-stage" aria-label="Toca-discos">
      <Turntable palette={palette} level={level} playing={playing} progress={progress} />
      {timer ? (
        <Link className="now-playing" to={backOf(timer)}>
          <span className="stack" style={{ gap: 2, minWidth: 0 }}>
            <span className="muted small">{timer.pausedAt ? 'Pausado' : 'Tocando agora'}</span>
            <strong className="truncate">{timer.topic}</strong>
          </span>
          <strong className="now-clock">{clock(seconds)}</strong>
        </Link>
      ) : (
        fallback && (
          <Link className="now-playing" to={`/tema/${fallback.id}`}>
            <span className="stack" style={{ gap: 2, minWidth: 0 }}>
              <span className="muted small">Continuar</span>
              <strong className="truncate">{fallback.title}</strong>
            </span>
            <svg width="22" height="22" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5 19.5 12 7 19.5Z" fill="currentColor" /></svg>
          </Link>
        )
      )}
    </aside>
  )
}
