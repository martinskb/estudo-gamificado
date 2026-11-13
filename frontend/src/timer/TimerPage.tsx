import { type FormEvent, useEffect, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { post } from '../api/client'
import type { Conclusion } from '../api/types'
import { Celebration } from './Celebration'
import {
  type TimerState, activeSeconds, loadTimer, pause, resume, saveTimer, startTimer,
} from './timerState'

function clock(total: number): string {
  const h = Math.floor(total / 3600)
  const m = Math.floor((total % 3600) / 60)
  const s = total % 60
  const mm = String(m).padStart(2, '0')
  const ss = String(s).padStart(2, '0')
  return h > 0 ? `${h}:${mm}:${ss}` : `${mm}:${ss}`
}

export function TimerPage() {
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const [timer, setTimerState] = useState<TimerState | null>(() => loadTimer())
  const [now, setNow] = useState(() => Date.now())
  const [topic, setTopic] = useState(params.get('topic') ?? '')
  const [goal, setGoal] = useState(25)
  const [finishing, setFinishing] = useState(false)
  const [note, setNote] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [done, setDone] = useState<{ result: Conclusion; minutes: number; back: string } | null>(null)

  const partParam = Number(params.get('part')) || null
  const trailParam = params.get('trail')

  function setTimer(next: TimerState | null) {
    saveTimer(next)
    setTimerState(next)
  }

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    // Ao voltar para a aba (tela desbloqueada), atualiza na hora.
    const onVisible = () => setNow(Date.now())
    document.addEventListener('visibilitychange', onVisible)
    return () => {
      clearInterval(id)
      document.removeEventListener('visibilitychange', onVisible)
    }
  }, [])

  if (done) {
    return (
      <Celebration
        result={done.result}
        minutes={done.minutes}
        backTo={done.back}
        backLabel={done.back === '/' ? 'Voltar ao início' : 'Voltar à trilha'}
      />
    )
  }

  if (!timer) {
    const start = (e: FormEvent) => {
      e.preventDefault()
      const t = startTimer(topic.trim(), goal, partParam, Date.now())
      if (trailParam) sessionStorage.setItem('timer:back', `/trilha/${trailParam}`)
      else sessionStorage.removeItem('timer:back')
      setNow(Date.now())
      setTimer(t)
      // Veio de uma trilha: volta para lá, onde está a aula. O cronômetro segue na faixa de baixo.
      if (trailParam) navigate(`/trilha/${trailParam}`)
    }
    return (
      <main className="shell">
        <h1>Estudar</h1>
        <form className="card stack" onSubmit={start}>
          <label>
            O que você vai estudar?
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              maxLength={120}
              placeholder="ex.: Cálculo, Redação, SQL"
            />
          </label>
          <label>
            Meta desta sessão (minutos)
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={600}
              value={goal}
              onChange={(e) => setGoal(Math.max(1, Math.min(600, Number(e.target.value) || 1)))}
            />
            <span className="muted small">Sessões de 20 min ou mais valem 10 pontos.</span>
          </label>
          <button className="btn primary block" disabled={topic.trim().length === 0}>
            Iniciar cronômetro
          </button>
        </form>
      </main>
    )
  }

  const seconds = activeSeconds(timer, now)
  const goalSeconds = timer.goalMinutes * 60
  const paused = timer.pausedAt !== null
  const pct = Math.min(100, (seconds / goalSeconds) * 100)

  async function conclude() {
    if (!timer || busy) return
    const frozen = pause(timer, Date.now())
    setTimer(frozen)
    setBusy(true)
    setError('')
    const active = activeSeconds(frozen, Date.now())
    try {
      const result = await post<Conclusion>('/sessions', {
        client_id: frozen.clientId,
        topic: frozen.topic,
        part_id: frozen.partId,
        goal_minutes: frozen.goalMinutes,
        started_at: new Date(frozen.startedAt).toISOString(),
        ended_at: new Date(frozen.pausedAt!).toISOString(),
        active_seconds: active,
        note: note.trim() || null,
      })
      const back = sessionStorage.getItem('timer:back') ?? '/'
      sessionStorage.removeItem('timer:back')
      setTimer(null)
      setDone({ result, minutes: Math.floor(active / 60), back })
    } catch (err) {
      // O cronômetro continua salvo e pausado: dá para tentar de novo sem perder nada.
      setError(err instanceof Error ? err.message : 'Não deu para salvar a sessão.')
    } finally {
      setBusy(false)
    }
  }

  if (finishing) {
    return (
      <main className="shell">
        <h1>Concluir sessão</h1>
        <div className="card stack">
          <div className="row spread"><span>{timer.topic}</span><strong>{clock(seconds)}</strong></div>
          <label>
            Anotação (opcional)
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              placeholder="O que você estudou? Onde parou?"
            />
          </label>
          {error && <p className="error" role="alert">{error}</p>}
          <button className="btn primary block" onClick={conclude} disabled={busy}>
            {busy ? 'Salvando…' : error ? 'Tentar de novo' : 'Salvar sessão'}
          </button>
          <button
            className="btn ghost block"
            disabled={busy}
            onClick={() => {
              setFinishing(false)
              setTimer(resume(timer, Date.now()))
            }}
          >
            Continuar estudando
          </button>
        </div>
      </main>
    )
  }

  return (
    <main className="shell center">
      <div className="stack center" style={{ marginTop: 'var(--space-6)' }}>
        <p className="muted">{timer.topic}</p>
        <div className="clock" role="timer" aria-live="off">{clock(seconds)}</div>
        <p className="muted">
          {paused ? 'Pausado' : seconds >= goalSeconds ? 'Meta cumprida!' : `Meta: ${timer.goalMinutes} min`}
        </p>
      </div>
      <div className="bar" style={{ width: '100%' }} aria-hidden><span style={{ width: `${pct}%` }} /></div>
      <div className="stack" style={{ width: '100%' }}>
        <button
          className="btn block"
          onClick={() => setTimer(paused ? resume(timer, Date.now()) : pause(timer, Date.now()))}
        >
          {paused ? 'Retomar' : 'Pausar'}
        </button>
        <button
          className="btn primary block"
          onClick={() => {
            setTimer(pause(timer, Date.now()))
            setFinishing(true)
          }}
        >
          Concluir
        </button>
        <button
          className="btn ghost block"
          onClick={() => {
            if (seconds < 60 || window.confirm('Descartar esta sessão sem salvar?')) setTimer(null)
          }}
        >
          Descartar
        </button>
      </div>
      <Link className="muted small" to="/">Voltar ao início (o cronômetro continua)</Link>
    </main>
  )
}
