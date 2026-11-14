import { type CSSProperties, useRef, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { api, post } from '../api/client'
import type { Topic, TopicDetail } from '../api/types'
import { useApi } from '../api/useApi'
import { GoalChips, OtherSession, RunningSession } from '../timer/Session'
import { useSession } from '../timer/useSession'
import { ConfirmButton } from '../ui/ConfirmButton'
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
  const [uploading, setUploading] = useState(false)
  const [makingTrail, setMakingTrail] = useState(false)
  const [photoError, setPhotoError] = useState('')
  const [goal, setGoal] = useState(25)
  const [choosingGoal, setChoosingGoal] = useState(false)
  const session = useSession({ topic: topic?.title ?? '', back: `/tema/${id}`, topicId: Number(id) })
  const photoRef = useRef<HTMLInputElement>(null)

  if (error) {
    return (
      <main className="shell narrow">
        <p className="error" role="alert">{error}</p>
        {session.mine && <Link className="btn primary block" to="/concluir">Ver sessão em andamento</Link>}
        <Link className="btn block" to="/">Voltar ao início</Link>
      </main>
    )
  }
  if (!topic) return <PageSkeleton variant="topic" />

  async function choosePhoto(file: File | undefined) {
    if (!file || !topic) return
    setUploading(true)
    setPhotoError('')
    try {
      const cover = await photoToCover(file)
      const saved = await api<Topic>(`/topics/${topic.id}`, { method: 'PATCH', body: JSON.stringify({ cover }) })
      setData({ ...topic, ...saved })
    } catch (err) {
      setPhotoError(err instanceof Error ? err.message : 'Não deu para usar essa foto.')
    } finally {
      setUploading(false)
      if (photoRef.current) photoRef.current.value = ''
    }
  }

  const lv = topic.level
  const trail = topic.trail

  return (
    <main className="shell">
      <Link className="muted small" to="/" style={{ textDecoration: 'none', fontWeight: 600 }}>‹ Aprendendo</Link>

      <section className="topic-hero">
        <div className="cover-wrap">
          <Cover topic={topic} size="hero" showTitle={false} />
          <button
            className={`cover-photo-btn${topic.cover ? '' : ' empty'}`}
            onClick={() => photoRef.current?.click()}
            disabled={uploading}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 8h3l2-3h6l2 3h3v11H4z" />
              <circle cx="12" cy="13" r="3.5" />
            </svg>
            {uploading ? 'Enviando…' : topic.cover ? 'Trocar foto' : 'Adicionar foto'}
          </button>
          <input ref={photoRef} type="file" accept="image/*" hidden onChange={(e) => choosePhoto(e.target.files?.[0])} />
        </div>
        <div className="stack" style={{ gap: 'var(--space-4)' }}>
          <div className="stack" style={{ gap: 'var(--space-2)' }}>
            <h1>{topic.title}</h1>
            <p className="muted">
              {formatHours(topic.total_seconds)} focadas · {topic.sessions} {topic.sessions === 1 ? 'sessão' : 'sessões'}
              {topic.streak > 0 && ` · ${topic.streak} ${topic.streak === 1 ? 'dia seguido' : 'dias seguidos'} neste tema`}
            </p>
          </div>
          {session.mine ? (
            <RunningSession session={session} />
          ) : session.other ? (
            <OtherSession timer={session.other} />
          ) : (
            <div className="stack" style={{ gap: 'var(--space-3)' }}>
              <div className="play-row">
                <button className="play" onClick={() => session.start(goal)} aria-label={`Focar ${goal} minutos em ${topic.title}`}>
                  <svg width="28" height="28" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.5 19.5 12 7 19.5Z" fill="currentColor" /></svg>
                </button>
                <div className="stack" style={{ gap: 2 }}>
                  <strong>Focar {goal} min</strong>
                  <button className="link-btn muted small" onClick={() => setChoosingGoal((c) => !c)} aria-expanded={choosingGoal}>
                    Escolher outra meta
                  </button>
                </div>
              </div>
              {choosingGoal && <GoalChips value={goal} onChange={(m) => { setGoal(m); setChoosingGoal(false) }} />}
            </div>
          )}
          <div className="row wrap" style={{ gap: 'var(--space-2)' }}>
            {trail ? (
              <Link className="btn soft small" to={`/trilha/${trail.id}`}>
                {trail.next_part ? `Trilha com vídeos · continuar parte ${trail.next_part}` : 'Trilha com vídeos · concluída'}
              </Link>
            ) : (
              <button className="btn soft small" onClick={() => setMakingTrail((m) => !m)} aria-expanded={makingTrail}>
                Montar trilha com vídeos
              </button>
            )}
            <button className="btn ghost small" onClick={() => setEditing((e) => !e)} aria-expanded={editing}>
              Editar tema
            </button>
          </div>
        </div>
      </section>

      {photoError && <p className="error" role="alert">{photoError}</p>}

      {makingTrail && !trail && <TrailMaker title={topic.title} onCancel={() => setMakingTrail(false)} />}

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
    <section className="card stack" style={{ gap: 'var(--space-5)' }} aria-label="Editar tema">
      <div className="section-title">
        <h2>Editar tema</h2>
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
        <span className="muted small">Só você vê sua galeria.</span>
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
        <ConfirmButton
          className="btn ghost small"
          label="Tirar da galeria"
          confirmLabel="Tirar? Suas sessões continuam valendo"
          disabled={busy}
          onConfirm={remove}
        />
      </div>
      {error && <p className="error" role="alert">{error}</p>}
    </section>
  )
}

const KINDS = [
  { value: 'livre', label: 'Curiosidade' },
  { value: 'academico', label: 'Acadêmico' },
] as const

/** Monta a trilha do próprio tema: só pergunta o tipo, o tema já se sabe. */
function TrailMaker({ title, onCancel }: { title: string; onCancel: () => void }) {
  const navigate = useNavigate()
  const [kind, setKind] = useState<(typeof KINDS)[number]['value']>('livre')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  async function make() {
    setBusy(true)
    setError('')
    try {
      const r = await post<{ trail_id: number }>('/trails', { topic: title, level: kind })
      navigate(`/trilha/${r.trail_id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não deu para montar a trilha agora.')
      setBusy(false)
    }
  }

  return (
    <section className="card stack" style={{ gap: 'var(--space-4)' }} aria-label="Montar trilha com vídeos">
      <div className="segmented" role="radiogroup" aria-label="Tipo de trilha">
        {KINDS.map((k) => (
          <button key={k.value} type="button" role="radio" aria-checked={kind === k.value} onClick={() => setKind(k.value)}>
            {k.label}
          </button>
        ))}
      </div>
      {error && <p className="error" role="alert">{error}</p>}
      <div className="row">
        <button className="btn primary grow" onClick={make} disabled={busy}>{busy ? 'Montando…' : 'Montar trilha'}</button>
        <button className="btn ghost" onClick={onCancel} disabled={busy}>Cancelar</button>
      </div>
    </section>
  )
}
