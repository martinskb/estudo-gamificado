import { useState } from 'react'
import { put } from '../api/client'
import type { Me, Ranking } from '../api/types'
import { useApi } from '../api/useApi'
import { getNickname } from '../auth/auth'

export function RankingPage() {
  const { data: me, setData: setMe } = useApi<Me>('/me')
  const { data: ranking, error, reload } = useApi<Ranking>('/ranking')
  const [busy, setBusy] = useState(false)
  const [toggleError, setToggleError] = useState('')
  const mine = getNickname()

  async function toggle() {
    if (!me) return
    setBusy(true)
    setToggleError('')
    try {
      await put('/me/settings', { in_ranking: !me.in_ranking })
      setMe({ ...me, in_ranking: !me.in_ranking })
      reload()
    } catch {
      setToggleError('Não deu para salvar. Tente de novo.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="shell narrow">
      <div className="stack">
        <h1>Ranking da semana</h1>
        <p className="muted">
          Pontos de segunda a domingo. Participar é opcional e só mostra seu apelido.
        </p>
      </div>

      {me && (
        <section className="card stack" style={{ gap: 'var(--space-3)' }}>
          <div className="row spread">
            <span>{me.in_ranking ? 'Você está no ranking.' : 'Você não está no ranking.'}</span>
            <button className={`btn ${me.in_ranking ? '' : 'primary'}`} onClick={toggle} disabled={busy}>
              {me.in_ranking ? 'Sair do ranking' : 'Participar'}
            </button>
          </div>
          {toggleError && <p className="error" role="alert">{toggleError}</p>}
          {ranking?.me && (
            <p className="muted small">
              Sua posição: {ranking.me.position}º, com {ranking.me.week_points} pontos.
            </p>
          )}
        </section>
      )}

      {error && (
        <div className="notice warn stack">
          <p>{error}</p>
          <button className="btn" onClick={reload}>Tentar de novo</button>
        </div>
      )}
      {!ranking && !error && <p className="muted">Carregando…</p>}
      {ranking && ranking.top.length === 0 && (
        <p className="muted">Ninguém no ranking ainda. Seja a primeira pessoa.</p>
      )}
      {ranking && ranking.top.length > 0 && (
        <ol className="card list">
          {ranking.top.map((row, i) => (
            <li key={row.nickname} className="row" style={{ fontWeight: row.nickname === mine ? 700 : 400 }}>
              <span className="muted" style={{ width: 28 }}>{i + 1}º</span>
              <span className="grow truncate">{row.nickname}{row.nickname === mine ? ' (você)' : ''}</span>
              <span className="pill" title="Ofensiva">{row.streak} {row.streak === 1 ? 'dia' : 'dias'}</span>
              <strong style={{ minWidth: 64, textAlign: 'right' }}>{row.week_points} pts</strong>
            </li>
          ))}
        </ol>
      )}
    </main>
  )
}
