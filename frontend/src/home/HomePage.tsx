import { Link, useNavigate } from 'react-router-dom'
import type { Progress } from '../api/types'
import { useApi } from '../api/useApi'
import { clearLogin, getNickname } from '../auth/auth'
import { TrailList } from '../trails/TrailList'

export function HomePage() {
  const navigate = useNavigate()
  const { data: p, error, reload } = useApi<Progress>('/progress')

  function leave() {
    clearLogin()
    navigate('/entrar', { replace: true })
  }

  return (
    <main className="shell">
      <div className="row spread">
        <h1>Olá, {getNickname()}</h1>
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
          <section className="card streak-hero" aria-label="Ofensiva">
            <span className="big-number" style={{ color: p.streak > 0 ? 'var(--accent)' : 'var(--muted)' }}>
              {p.streak}
            </span>
            <div className="stack grow" style={{ gap: 'var(--space-1)' }}>
              <strong>{p.streak === 1 ? 'dia seguido' : 'dias seguidos'}</strong>
              <span className="muted small">
                {p.studied_today ? 'Você já estudou hoje.' : 'Estude hoje para aumentar a ofensiva.'}
              </span>
              {p.freezes > 0 && (
                <span className="pill" title="Usada sozinha se você perder um dia">
                  Proteção ×{p.freezes}
                </span>
              )}
            </div>
          </section>

          {!p.studied_today && p.streak > 0 && (
            <p className="notice warn" role="status">
              Você ainda não estudou hoje — sua ofensiva de {p.streak} {p.streak === 1 ? 'dia' : 'dias'} está em risco.
            </p>
          )}

          <section className="card stack" aria-label="Meta da semana">
            <div className="row spread">
              <strong>Esta semana</strong>
              <span className="muted">{p.week_days} de {p.week_goal_days} dias</span>
            </div>
            <div className="bar" aria-hidden>
              <span style={{ width: `${Math.min(100, (p.week_days / p.week_goal_days) * 100)}%` }} />
            </div>
          </section>

          <div className="stack">
            <Link className="btn primary block" to="/estudar">Estudar agora</Link>
            <Link className="btn block" to="/aprender">Quero aprender…</Link>
          </div>

          <section className="stack" aria-label="Suas trilhas">
            <h2>Suas trilhas</h2>
            {p.trails.length === 0 ? (
              <p className="muted">
                Nenhuma trilha ainda. Diga o que quer aprender e o app monta um caminho com aulas
                gratuitas.
              </p>
            ) : (
              <TrailList trails={p.trails} />
            )}
          </section>
        </>
      )}
    </main>
  )
}
