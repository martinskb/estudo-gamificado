import { Link, useNavigate } from 'react-router-dom'
import type { Progress, Trail } from '../api/types'
import { useApi } from '../api/useApi'
import { clearLogin, getNickname } from '../auth/auth'
import { Logo } from '../brand/Logo'
import { todayBelem } from '../progress/calendarGrid'
import { TrailList } from '../trails/TrailList'
import { stepsAround, weekStrip } from './homeModel'

export function HomePage() {
  const navigate = useNavigate()
  const { data: p, error, reload } = useApi<Progress>('/progress')
  const current = p?.trails[0]
  const { data: trail } = useApi<Trail>(current ? `/trails/${current.trail_id}` : null)

  function leave() {
    clearLogin()
    navigate('/entrar', { replace: true })
  }

  return (
    <main className="shell">
      <div className="row spread">
        <Logo size={30} />
        <button className="btn ghost" style={{ minHeight: 40 }} onClick={leave}>Sair</button>
      </div>

      {error && (
        <div className="notice warn stack">
          <p>{error}</p>
          <button className="btn" onClick={reload}>Tentar de novo</button>
        </div>
      )}
      {!p && !error && <p className="muted">Carregando…</p>}

      {p && (
        <>
          <div className="row spread wrap">
            <h1>Olá, {getNickname()}</h1>
            <span className="row" style={{ gap: 'var(--space-2)' }}>
              <span className="pill highlight">
                {p.streak} {p.streak === 1 ? 'dia seguido' : 'dias seguidos'}
              </span>
              {p.freezes > 0 && (
                <span className="pill" title="Usada sozinha se você perder um dia">Proteção ×{p.freezes}</span>
              )}
            </span>
          </div>

          {!p.studied_today && p.streak > 0 && (
            <p className="notice warn" role="status">
              Você ainda não estudou hoje — sua ofensiva de {p.streak} {p.streak === 1 ? 'dia' : 'dias'} está em risco.
            </p>
          )}

          {current && trail?.status === 'ready' ? (
            <ContinueCard trail={trail} />
          ) : (
            !current && (
              <section className="continue-card" aria-label="Comece uma trilha">
                <span className="eyebrow">COMECE POR AQUI</span>
                <h2>O que você quer aprender?</h2>
                <p>O Lume divide o tema em degraus, busca aulas gratuitas e prepara exercícios.</p>
                <Link className="btn highlight block" to="/aprender">Montar minha primeira trilha</Link>
              </section>
            )
          )}

          <section className="card stack" aria-label="Esta semana">
            <div className="row spread">
              <strong>Esta semana</strong>
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

          <div className="stack">
            {current && <Link className="btn block" to="/aprender">Quero aprender algo novo…</Link>}
            <Link className="btn ghost block" to="/estudar">Sessão livre (sem trilha)</Link>
          </div>

          {p.trails.length > 1 && (
            <section className="stack" aria-label="Outras trilhas">
              <h2>Outras trilhas</h2>
              <TrailList trails={p.trails.slice(1)} />
            </section>
          )}
        </>
      )}
    </main>
  )
}

function ContinueCard({ trail }: { trail: Trail }) {
  const { next, steps } = stepsAround(trail.parts)
  return (
    <section className="continue-card" aria-label="Continue de onde parou">
      <span className="eyebrow">{next ? 'CONTINUE DE ONDE PAROU' : 'TRILHA CONCLUÍDA'}</span>
      <h2>{trail.title}</h2>
      <ol className="steps">
        {steps.map((s) => (
          <li key={s.id} className={s.state}>
            <span className="step-mark" aria-hidden="true">{s.state === 'done' ? '✓' : s.order}</span>
            <span className="truncate">{s.title}</span>
            <span className="sr-only">
              {s.state === 'done' ? '(concluída)' : s.state === 'current' ? '(próxima)' : ''}
            </span>
          </li>
        ))}
      </ol>
      <Link className="btn highlight block" to={`/trilha/${trail.id}`}>
        {next ? `Estudar parte ${next.order}` : 'Rever a trilha'}
      </Link>
    </section>
  )
}
