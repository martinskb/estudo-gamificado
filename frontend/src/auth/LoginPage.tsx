import { type FormEvent, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ApiError, post } from '../api/client'
import type { EnterResponse } from '../api/types'
import { Logo } from '../brand/Logo'
import { saveLogin } from './auth'

export function LoginPage() {
  const navigate = useNavigate()
  const [nickname, setNickname] = useState('')
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const nicknameOk = /^[A-Za-z0-9_]{3,20}$/.test(nickname)
  const pinOk = /^\d{4}$/.test(pin)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setBusy(true)
    try {
      const r = await post<EnterResponse>('/auth/enter', { nickname, pin })
      saveLogin(r.token, r.user.nickname)
      navigate('/', { replace: true })
    } catch (err) {
      const status = err instanceof ApiError ? err.status : 0
      if (status === 401) setError('PIN incorreto para esse apelido.')
      else if (status === 429) setError('Muitas tentativas. Espere 5 minutos.')
      else setError(err instanceof Error ? err.message : 'Não deu para entrar.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="shell" style={{ justifyContent: 'center' }}>
      <div className="stack">
        <Logo size={44} />
        <p style={{ fontSize: '1.1rem', fontWeight: 600 }}>Estude no seu ritmo, um degrau por dia.</p>
        <h1 style={{ marginTop: 'var(--space-4)' }}>Entrar</h1>
        <p className="muted">
          Escolha um apelido e um PIN de 4 dígitos. Se o apelido for novo, a conta é criada na
          hora. Use os mesmos no celular e no computador.
        </p>
      </div>
      <form className="card stack" onSubmit={submit}>
        <label>
          Apelido
          <input
            value={nickname}
            onChange={(e) => setNickname(e.target.value.trim())}
            autoCapitalize="none"
            autoComplete="username"
            maxLength={20}
            placeholder="ex.: ana_ads"
          />
          <span className="muted small">3 a 20 letras, números ou _</span>
        </label>
        <label>
          PIN
          <input
            value={pin}
            onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
            inputMode="numeric"
            type="password"
            autoComplete="current-password"
            placeholder="4 dígitos"
          />
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn primary block" disabled={!nicknameOk || !pinOk || busy}>
          {busy ? 'Entrando…' : 'Entrar'}
        </button>
        {busy && (
          <p className="muted small" role="status">
            Se o servidor estava parado, o primeiro acesso pode levar até 1 minuto.
          </p>
        )}
      </form>
      <p className="muted small">
        Não pedimos nome, e-mail nem matrícula. Sem o PIN não há como recuperar a conta.
      </p>
    </main>
  )
}
