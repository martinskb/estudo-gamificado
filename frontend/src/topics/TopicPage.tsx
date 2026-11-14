import { type CSSProperties, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api } from '../api/client'
import type { Topic, TopicDetail } from '../api/types'
import { useApi } from '../api/useApi'
import { loadTimer, saveTimer, startTimer } from '../timer/timerState'
import { PageSkeleton } from '../ui/Skeleton'
import { Cover } from './Cover'
import { PALETTES, type PaletteName, formatHours, photoToCover } from './cover'

const dayLabel = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit', timeZone: 'UTC' })
}

export function TopicPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { data: topic, error, setData } = useApi<TopicDetail>(`/topics/${id}`)
  const [editing, setEditing] = useState(false)

  if (error) {
    return (
      <main className="shell narrow">
        <p className="error" role="alert">{error}</p>
        <Link className="btn block" to="/">Voltar ao início</Link>
      </main>
    )
  }
  if (!topic) return <PageSkeleton variant="topic" />

  const running = loadTimer()

  function play() {
    if (!topic) return
    if (!running) {
      saveTimer(startTimer(topic.title, 25, null, Date.now(), topic.id))
      sessionStorage.setItem('timer:back', `/tema/${topic.id}`)
    }
    navigate('/estudar')
  }

  const lv = topic.level
  const trail = topic.trail

  return (
    <main className="shell">
      <Link className="muted small" to="/" style={{ textDecoration: 'none', fontWeight: 600 }}>‹ Aprendendo</Link>

      <section className="topic-hero">
        <Cover topic={topic} size="hero" showTitle={false} />
        <div className="stack" style={{ gap: 'var(--space-4)' }}>
          <div className="stack" style={{ gap: 'var(--space-2)' }}>
            <h1>{topic.title}</h1>
            <p className="muted">
              {formatHours(topic.total_seconds)} focadas · {topic.sessions} {topic.sessions === 1 ? 'sessão' : 'sessões'}
              {topic.streak > 0 && ` · ${topic.streak} ${topic.streak === 1 ? 'dia seguido' : 'dias seguidos'} neste tema`}
            </p>
          </div>
          <div className="play-row">
            <button className="play" onClick={play} aria-label={running ? 'Ver cronômetro em andamento' : `Focar 25 minutos em ${topic.title}`}>
              <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5 19.5 12 7 19.5Z" fill="currentColor" /></svg>
            </button>
            <div className="stack" style={{ gap: 2 }}>
              <strong>{running ? 'Cronômetro em andamento' : 'Focar 25 min'}</strong>
              {!running && (
                <Link className="muted small" to={`/estudar?topic=${encodeURIComponent(topic.title)}&topic_id=${topic.id}`}>
                  Escolher outra meta
                </Link>
              )}
            </div>
          </div>
          <div className="row wrap" style={{ gap: 'var(--space-2)' }}>
            {trail ? (
              <Link className="btn soft small" to={`/trilha/${trail.id}`}>
                {trail.next_part ? `Trilha com vídeos · continuar parte ${trail.next_part}` : 'Trilha com vídeos · concluída'}
              </Link>
            ) : (
              <Link className="btn soft small" to={`/aprender?tema=${encodeURIComponent(topic.title)}`}>Montar trilha com vídeos</Link>
            )}
            <button className="btn ghost small" onClick={() => setEditing((e) => !e)} aria-expanded={editing}>
              Editar capa
            </button>
          </div>
        </div>
      </section>

      {editing && (
        <CoverEditor
          topic={topic}
          onSaved={(t) => setData({ ...topic, ...t })}
          onDeleted={() => navigate('/', { replace: true })}
          onClose={() => setEditing(false)}
        />
      )}

      <div className="columns">
        <div>
          <section className="card stack" style={{ gap: 'var(--space-4)' }} aria-label="Sessões">
            <h2>Sessões</h2>
            {topic.tracks.length === 0 ? (
              <p className="muted">Nenhuma sessão ainda. Aperte o play para começar.</p>
            ) : (
              <ol className="tracks">
                {topic.tracks.map((t, i) => (
                  <li key={t.id}>
                    <span className="n">{i + 1}</span>
                    <span className="stack" style={{ gap: 0, minWidth: 0 }}>
                      <span className="truncate" style={{ fontWeight: 600 }}>{t.note || dayLabel(t.day)}</span>
                      <span className="muted small">
                        {t.note ? `${dayLabel(t.day)} · ` : ''}{t.goal_met ? 'meta cumprida' : `meta de ${t.goal_minutes} min`}
                      </span>
                    </span>
                    <strong className="small" style={{ fontVariantNumeric: 'tabular-nums' }}>{formatHours(t.active_seconds)}</strong>
                  </li>
                ))}
              </ol>
            )}
          </section>
        </div>
        <div>
          <section className="card level-card" aria-label="Nível de luz">
            <span className="muted small" style={{ fontWeight: 700, letterSpacing: '0.06em' }}>NÍVEL DE LUZ</span>
            <strong style={{ fontFamily: 'var(--font-display)', fontSize: '1.4rem' }}>{lv.name}</strong>
            <div className="bar" aria-hidden><span style={{ width: `${Math.round(lv.progress * 100)}%` }} /></div>
            <span className="muted small">
              {lv.next_name ? `${lv.next_name} em ${formatHours(lv.seconds_to_next)}` : 'Nível máximo. Você é um farol nesse tema!'}
            </span>
            <span className="muted small">Faísca 1 h · Chama 5 h · Lanterna 15 h · Farol 40 h</span>
          </section>
        </div>
      </div>
    </main>
  )
}

type EditorProps = { topic: TopicDetail; onSaved: (t: Topic) => void; onDeleted: () => void; onClose: () => void }

function CoverEditor({ topic, onSaved, onDeleted, onClose }: EditorProps) {
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [title, setTitle] = useState(topic.title)
  const fileRef = useRef<HTMLInputElement>(null)

  async function patch(body: Record<string, unknown>) {
    setBusy(true)
    setError('')
    try {
      onSaved(await api<Topic>(`/topics/${topic.id}`, { method: 'PATCH', body: JSON.stringify(body) }))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não deu para salvar.')
    } finally {
      setBusy(false)
    }
  }

  async function pickPhoto(file: File | undefined) {
    if (!file) return
    try {
      await patch({ cover: await photoToCover(file) })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não deu para usar essa foto.')
    }
  }

  async function remove() {
    if (!window.confirm(`Tirar "${topic.title}" da galeria? Suas sessões e pontos continuam valendo.`)) return
    setBusy(true)
    try {
      await api(`/topics/${topic.id}`, { method: 'DELETE' })
      onDeleted()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não deu para apagar.')
      setBusy(false)
    }
  }

  return (
    <section className="card stack" style={{ gap: 'var(--space-5)' }} aria-label="Editar capa">
      <div className="section-title">
        <h2>Capa e tema</h2>
        <button className="btn ghost small" onClick={onClose}>Fechar</button>
      </div>

      <div className="stack" style={{ gap: 'var(--space-3)' }}>
        <span className="small" style={{ fontWeight: 600 }}>Foto</span>
        <div className="row wrap" style={{ gap: 'var(--space-2)' }}>
          <button className="btn soft small" disabled={busy} onClick={() => fileRef.current?.click()}>
            {topic.cover ? 'Trocar foto' : 'Escolher foto'}
          </button>
          {topic.cover && (
            <button className="btn ghost small" disabled={busy} onClick={() => patch({ cover: null })}>Tirar foto</button>
          )}
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => pickPhoto(e.target.files?.[0])} />
        </div>
        <span className="muted small">A foto vira duas cores da paleta escolhida. Só você vê sua galeria.</span>
      </div>

      <div className="stack" style={{ gap: 'var(--space-3)' }}>
        <span className="small" style={{ fontWeight: 600 }} id="palette-label">Paleta</span>
        <div className="palette-chips" role="radiogroup" aria-labelledby="palette-label">
          {(Object.keys(PALETTES) as PaletteName[]).map((name) => (
            <button
              key={name}
              role="radio"
              aria-checked={topic.palette === name}
              aria-label={PALETTES[name].label}
              title={PALETTES[name].label}
              className="palette-chip"
              style={{ '--a': PALETTES[name].dark, '--b': PALETTES[name].light } as CSSProperties}
              disabled={busy}
              onClick={() => patch({ palette: name })}
            />
          ))}
        </div>
      </div>

      <form
        className="row"
        style={{ alignItems: 'flex-end' }}
        onSubmit={(e) => {
          e.preventDefault()
          if (title.trim() && title.trim() !== topic.title) void patch({ title: title.trim() })
        }}
      >
        <label className="grow">
          Nome do tema
          <input value={title} maxLength={80} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <button className="btn soft" disabled={busy || !title.trim() || title.trim() === topic.title}>Salvar</button>
      </form>

      <div className="row wrap" style={{ gap: 'var(--space-2)' }}>
        <button className="btn ghost small" disabled={busy} onClick={() => patch({ done: !topic.done })}>
          {topic.done ? 'Voltar a aprender' : 'Marcar como concluído'}
        </button>
        <button className="btn ghost small" disabled={busy} onClick={remove} style={{ color: 'var(--danger)' }}>
          Tirar da galeria
        </button>
      </div>
      {error && <p className="error" role="alert">{error}</p>}
    </section>
  )
}
