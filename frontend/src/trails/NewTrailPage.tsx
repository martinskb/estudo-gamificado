import { type FormEvent, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { api, post } from '../api/client'
import type { CatalogItem } from '../api/types'

const LEVELS = [
  { value: 'livre', label: 'Só quero aprender' },
  { value: 'vestibular', label: 'Vestibular / ENEM' },
  { value: 'superior', label: 'Faculdade' },
]

export function NewTrailPage() {
  const navigate = useNavigate()
  const [topic, setTopic] = useState('')
  const [level, setLevel] = useState('livre')
  const [suggestions, setSuggestions] = useState<CatalogItem[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const query = topic.trim()

  // Sugestões do catálogo enquanto digita (ou os temas populares, com o campo vazio).
  useEffect(() => {
    let cancelled = false
    const id = setTimeout(
      () => {
        api<CatalogItem[]>(`/catalog?q=${encodeURIComponent(query)}`)
          .then((items) => !cancelled && setSuggestions(items))
          .catch(() => !cancelled && setSuggestions([]))
      },
      query ? 300 : 0,
    )
    return () => {
      cancelled = true
      clearTimeout(id)
    }
  }, [query])

  async function open(action: () => Promise<number>) {
    setBusy(true)
    setError('')
    try {
      navigate(`/trilha/${await action()}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Não deu para abrir a trilha.')
      setBusy(false)
    }
  }

  const create = (e: FormEvent) => {
    e.preventDefault()
    void open(async () => (await post<{ trail_id: number }>('/trails', { topic: query, level })).trail_id)
  }

  const pick = (item: CatalogItem) =>
    open(async () => {
      await post(`/trails/${item.trail_id}/start`)
      return item.trail_id
    })

  return (
    <main className="shell narrow">
      <div className="stack">
        <h1>Quero aprender…</h1>
        <p className="muted">
          Diga o tema. O app divide em partes, busca aulas gratuitas no YouTube e prepara
          exercícios de fixação.
        </p>
      </div>

      <form className="card stack" onSubmit={create}>
        <label>
          Tema
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            maxLength={120}
            placeholder="ex.: Funções do 1º grau, SQL básico"
            autoFocus
          />
        </label>
        <label>
          Para quê?
          <select value={level} onChange={(e) => setLevel(e.target.value)}>
            {LEVELS.map((l) => <option key={l.value} value={l.value}>{l.label}</option>)}
          </select>
        </label>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn primary block" disabled={query.length < 3 || busy}>
          {busy ? 'Abrindo…' : 'Montar minha trilha'}
        </button>
      </form>

      {suggestions.length > 0 && (
        <section className="stack" aria-label="Trilhas prontas">
          <h2>{query ? 'Já existe trilha pronta' : 'Temas populares'}</h2>
          <p className="muted small">Trilhas prontas abrem na hora.</p>
          {suggestions.map((s) => (
            <button
              key={s.trail_id}
              className="btn block"
              style={{ justifyContent: 'flex-start' }}
              disabled={busy}
              onClick={() => pick(s)}
            >
              {s.title}
            </button>
          ))}
        </section>
      )}
    </main>
  )
}
