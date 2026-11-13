import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ApiError, api, post } from '../api/client'
import type { CatalogItem, Trail, TrailPart } from '../api/types'
import { loadTimer } from '../timer/timerState'

const STEPS = ['dividindo o tema', 'buscando aulas', 'criando exercícios']
const STEP_LABEL = ['Dividindo o tema em partes', 'Buscando aulas no YouTube', 'Criando exercícios']
const POLL_MS = 2000
const GIVE_UP_MS = 120_000

function duration(seconds: number): string {
  if (!seconds) return ''
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`
}

export function TrailPage() {
  const { id } = useParams()
  const [trail, setTrail] = useState<Trail | null>(null)
  const [error, setError] = useState('')
  const [timedOut, setTimedOut] = useState(false)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let stop = false
    let timer: ReturnType<typeof setTimeout>
    const started = Date.now()
    setTimedOut(false)

    async function load() {
      try {
        const t = await api<Trail>(`/trails/${id}`)
        if (stop) return
        setTrail(t)
        setError('')
        if (t.status !== 'generating') return
      } catch (err) {
        if (stop) return
        if (err instanceof ApiError && err.status === 404) {
          setError('Trilha não encontrada.')
          return
        }
        // falha de rede no meio da geração: continua tentando até o limite
      }
      if (Date.now() - started > GIVE_UP_MS) setTimedOut(true)
      else timer = setTimeout(load, POLL_MS)
    }

    void load()
    return () => {
      stop = true
      clearTimeout(timer)
    }
  }, [id, attempt])

  if (error) {
    return (
      <main className="shell">
        <p className="error" role="alert">{error}</p>
        <Link className="btn block" to="/">Voltar ao início</Link>
      </main>
    )
  }
  if (!trail) return <main className="shell"><p className="muted">Carregando…</p></main>

  if (trail.status === 'failed' || timedOut) {
    return (
      <Failed
        trail={trail}
        timedOut={timedOut}
        onRetry={async () => {
          await post('/trails', { topic: trail.title, level: 'livre' })
          setAttempt((a) => a + 1)
        }}
      />
    )
  }
  if (trail.status === 'generating') return <Generating trail={trail} />
  return <Ready trail={trail} onChange={setTrail} />
}

function Generating({ trail }: { trail: Trail }) {
  const current = Math.max(0, STEPS.indexOf(trail.step))
  return (
    <main className="shell">
      <div className="stack">
        <h1>{trail.title}</h1>
        <p className="muted">Montando sua trilha. Costuma levar menos de um minuto.</p>
      </div>
      <ol className="card list" aria-live="polite">
        {STEP_LABEL.map((label, i) => (
          <li key={label} className="row">
            <span aria-hidden style={{ width: 24, color: 'var(--accent)' }}>
              {i < current ? '✓' : i === current ? '…' : ''}
            </span>
            <span className={i > current ? 'muted' : ''} style={{ fontWeight: i === current ? 700 : 400 }}>
              {label}
            </span>
          </li>
        ))}
      </ol>
    </main>
  )
}

function Failed({ trail, timedOut, onRetry }: { trail: Trail; timedOut: boolean; onRetry: () => Promise<void> }) {
  const navigate = useNavigate()
  const [catalog, setCatalog] = useState<CatalogItem[]>([])
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    api<CatalogItem[]>('/catalog').then((items) => setCatalog(items.slice(0, 3))).catch(() => {})
  }, [])

  const reason = timedOut
    ? 'Está demorando mais que o normal.'
    : trail.error === 'quota'
      ? 'O limite diário de buscas no YouTube acabou. Amanhã volta ao normal.'
      : 'A IA não conseguiu montar essa trilha agora.'

  return (
    <main className="shell">
      <div className="stack">
        <h1>{trail.title}</h1>
        <div className="notice warn stack">
          <strong>Não deu para montar essa trilha agora</strong>
          <span>{reason}</span>
        </div>
      </div>
      {trail.error !== 'quota' && (
        <button
          className="btn primary block"
          disabled={busy}
          onClick={async () => {
            setBusy(true)
            try {
              await onRetry()
            } catch {
              // segue na tela de falha
            } finally {
              setBusy(false)
            }
          }}
        >
          {busy ? 'Tentando…' : 'Tentar de novo'}
        </button>
      )}
      {catalog.length > 0 && (
        <section className="stack" aria-label="Trilhas prontas">
          <h2>Enquanto isso, uma trilha pronta</h2>
          {catalog.map((c) => (
            <button
              key={c.trail_id}
              className="btn block"
              style={{ justifyContent: 'flex-start' }}
              onClick={async () => {
                await post(`/trails/${c.trail_id}/start`).catch(() => {})
                navigate(`/trilha/${c.trail_id}`)
              }}
            >
              {c.title}
            </button>
          ))}
        </section>
      )}
      <Link className="btn ghost block" to="/aprender">Escolher outro tema</Link>
    </main>
  )
}

function Ready({ trail, onChange }: { trail: Trail; onChange: (t: Trail) => void }) {
  const done = trail.parts.filter((p) => p.done).length
  const firstOpen = trail.parts.find((p) => !p.done)?.id ?? trail.parts[0]?.id
  const [open, setOpen] = useState<number | undefined>(firstOpen)

  return (
    <main className="shell">
      <div className="stack">
        <h1>{trail.title}</h1>
        <div className="row">
          <div className="bar grow" aria-hidden>
            <span style={{ width: `${trail.parts.length ? (done / trail.parts.length) * 100 : 0}%` }} />
          </div>
          <span className="muted small">{done} de {trail.parts.length} partes</span>
        </div>
      </div>
      {trail.parts.map((part) => (
        <PartCard
          key={part.id}
          trail={trail}
          part={part}
          open={open === part.id}
          onToggle={() => setOpen(open === part.id ? undefined : part.id)}
          onDone={() =>
            onChange({
              ...trail,
              parts: trail.parts.map((p) => (p.id === part.id ? { ...p, done: true } : p)),
            })
          }
        />
      ))}
    </main>
  )
}

type PartProps = { trail: Trail; part: TrailPart; open: boolean; onToggle: () => void; onDone: () => void }

function PartCard({ trail, part, open, onToggle, onDone }: PartProps) {
  const [playing, setPlaying] = useState<string | null>(null)
  const [message, setMessage] = useState('')
  const [busy, setBusy] = useState(false)
  const playerRef = useRef<HTMLDivElement>(null)

  const timer = loadTimer()
  const studyingThis = timer?.partId === part.id
  const studyUrl = `/estudar?topic=${encodeURIComponent(trail.title)}&part=${part.id}&trail=${trail.id}`

  async function markDone() {
    setBusy(true)
    setMessage('')
    try {
      await post(`/parts/${part.id}/done`)
      onDone()
    } catch (err) {
      setMessage(err instanceof Error ? err.message : 'Não deu para concluir.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="card stack">
      <button
        className="row spread"
        onClick={onToggle}
        aria-expanded={open}
        style={{ all: 'unset', display: 'flex', justifyContent: 'space-between', gap: 12, cursor: 'pointer', width: '100%' }}
      >
        <span className="stack" style={{ gap: 2 }}>
          <span className="muted small">Parte {part.order}</span>
          <strong>{part.title}</strong>
        </span>
        {part.done && <span className="pill">Concluída</span>}
      </button>

      {open && (
        <>
          {part.videos.length === 0 && (
            <p className="muted">Nenhuma aula encontrada para esta parte. Você pode estudar com seu próprio material.</p>
          )}
          {playing && (
            <div ref={playerRef} className="player">
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${playing}?autoplay=1`}
                title="Aula"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
              />
            </div>
          )}
          <ul className="list">
            {part.videos.map((v) => (
              <li key={v.youtube_id}>
                <button
                  className="video-row"
                  onClick={() => {
                    setPlaying(v.youtube_id)
                    requestAnimationFrame(() => playerRef.current?.scrollIntoView({ block: 'nearest' }))
                  }}
                  aria-pressed={playing === v.youtube_id}
                >
                  <img
                    src={`https://i.ytimg.com/vi/${v.youtube_id}/mqdefault.jpg`}
                    alt=""
                    loading="lazy"
                    width={120}
                    height={68}
                  />
                  <span className="stack grow" style={{ gap: 2 }}>
                    <span className="video-title">{v.title}</span>
                    <span className="muted small">
                      {v.channel}{v.duration_s ? ` · ${duration(v.duration_s)}` : ''}
                    </span>
                  </span>
                </button>
              </li>
            ))}
          </ul>

          <div className="stack">
            {studyingThis ? (
              <Link className="btn primary block" to="/estudar">Ver cronômetro desta parte</Link>
            ) : (
              <Link className="btn primary block" to={studyUrl}>
                {part.done ? 'Estudar de novo' : 'Estudar esta parte'}
              </Link>
            )}
            {part.done ? (
              <Link className="btn block" to={`/trilha/${trail.id}/parte/${part.id}/exercicios`}>
                Fazer exercícios
              </Link>
            ) : (
              <button className="btn block" onClick={markDone} disabled={busy}>
                {busy ? 'Salvando…' : 'Concluí esta parte'}
              </button>
            )}
            {message && <p className="notice warn" role="alert">{message}</p>}
          </div>
        </>
      )}
    </section>
  )
}
