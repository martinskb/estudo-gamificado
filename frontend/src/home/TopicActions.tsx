import { type ReactNode, useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { api } from '../api/client'
import type { Topic } from '../api/types'
import { removeCover, saveCover, useDeviceCover } from '../local/covers'
import { Sleeve } from '../topics/Cover'
import { formatHours, photoToCover } from '../topics/cover'

type Props = { topic: Topic; onClose: () => void; onChanged: () => void }

/** Menu do álbum (ao segurar na estante): tocar, foto, concluir e apagar, sem abrir o tema. */
export function TopicActions({ topic, onClose, onChanged }: Props) {
  const navigate = useNavigate()
  const photo = useDeviceCover(topic.id) ?? topic.cover
  const [confirming, setConfirming] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  async function act(fn: () => Promise<unknown>, close = true) {
    setBusy(true)
    setError('')
    try {
      await fn()
      onChanged()
      if (close) onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não deu certo. Tente de novo.')
    } finally {
      setBusy(false)
    }
  }

  const item = (label: string, icon: ReactNode, onClick: () => void, danger = false) => (
    <button className={`sheet-item${danger ? ' danger' : ''}`} onClick={onClick} disabled={busy}>
      {icon}
      <span>{label}</span>
    </button>
  )

  return createPortal(
    <div className="sheet-layer" onClick={onClose}>
      <section className="sheet" role="dialog" aria-label={`Ações de ${topic.title}`} onClick={(e) => e.stopPropagation()}>
        <div className="sheet-head">
          <Sleeve topic={topic} showTitle={false} className="sheet-sleeve" />
          <span className="stack" style={{ gap: 2, minWidth: 0 }}>
            <strong className="truncate">{topic.title}</strong>
            <span className="muted small">{formatHours(topic.total_seconds)} · disco {topic.level.name.toLowerCase()}</span>
          </span>
        </div>

        {confirming ? (
          <div className="stack" style={{ gap: 'var(--space-3)' }}>
            <p>Apagar <strong>{topic.title}</strong>? As sessões continuam no seu progresso.</p>
            <div className="confirm-row">
              <button className="btn danger grow" autoFocus disabled={busy} onClick={() => act(() => api(`/topics/${topic.id}`, { method: 'DELETE' }).then(() => removeCover(topic.id).catch(() => {})))}>
                Apagar
              </button>
              <button className="btn ghost" onClick={() => setConfirming(false)}>Cancelar</button>
            </div>
          </div>
        ) : (
          <div className="sheet-list">
            {item('Tocar 25 min', <Icon d="M7 4.5 19.5 12 7 19.5Z" fill />, () => {
              onClose()
              navigate(`/tema/${topic.id}?tocar=1`)
            })}
            <label className="sheet-item">
              <Icon d="M4 8h3l2-3h6l2 3h3v11H4zM12 16.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7" />
              <span>{photo ? 'Trocar foto' : 'Adicionar foto'}</span>
              <input
                type="file"
                accept="image/*"
                hidden
                disabled={busy}
                onChange={(e) => {
                  const file = e.target.files?.[0]
                  if (file) void act(async () => saveCover(topic.id, await photoToCover(file)))
                }}
              />
            </label>
            {photo && item('Tirar foto', <Icon d="M4 8h3l2-3h6l2 3h3v11H4zM5 5l14 14" />, () => act(() => removeCover(topic.id)))}
            {item(
              topic.done ? 'Voltar para Aprendendo' : 'Marcar como concluído',
              <Icon d={topic.done ? 'M9 14 4 9l5-5M4 9h11a5 5 0 0 1 0 10h-3' : 'M5 12.5 10 17 19 7'} />,
              () => act(() => api(`/topics/${topic.id}`, { method: 'PATCH', body: JSON.stringify({ done: !topic.done }) })),
            )}
            {item('Apagar tema', <Icon d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" />, () => setConfirming(true), true)}
          </div>
        )}

        {error && <p className="error small" role="alert">{error}</p>}
      </section>
    </div>,
    document.body,
  )
}

function Icon({ d, fill = false }: { d: string; fill?: boolean }) {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill={fill ? 'currentColor' : 'none'} stroke={fill ? 'none' : 'currentColor'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
    </svg>
  )
}
