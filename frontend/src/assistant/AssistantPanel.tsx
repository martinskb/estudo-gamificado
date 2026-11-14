import { type FormEvent, useState } from 'react'
import { post } from '../api/client'
import { AiText } from '../text/LazyRichText'

type Exchange = { question: string; answer?: string; error?: string }

/** Botão + painel do assistente de dúvidas. Não mexe no cronômetro. */
export function AssistantPanel({ topic }: { topic?: string }) {
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [log, setLog] = useState<Exchange[]>([])
  const [busy, setBusy] = useState(false)

  async function send(text: string, replaceLast = false) {
    setBusy(true)
    setLog((l) => [...(replaceLast ? l.slice(0, -1) : l), { question: text }])
    const finish = (patch: Partial<Exchange>) =>
      setLog((l) => [...l.slice(0, -1), { question: text, ...patch }])
    try {
      const r = await post<{ answer: string }>('/assistant', { question: text, topic: topic || null })
      finish({ answer: r.answer })
    } catch (err) {
      finish({ error: err instanceof Error ? err.message : 'Assistente indisponível.' })
    } finally {
      setBusy(false)
    }
  }

  function submit(e: FormEvent) {
    e.preventDefault()
    const text = question.trim()
    if (!text || busy) return
    setQuestion('')
    void send(text)
  }

  if (!open) {
    return (
      <button className="btn block" onClick={() => setOpen(true)}>
        Tirar uma dúvida com a IA
      </button>
    )
  }

  return (
    <section className="card stack" aria-label="Assistente de dúvidas">
      <div className="row spread">
        <h2>Tirar dúvida</h2>
        <button className="btn ghost" style={{ minHeight: 40 }} onClick={() => setOpen(false)}>Fechar</button>
      </div>
      {log.length === 0 && (
        <p className="muted small">
          Pergunte o que quiser sobre {topic ? `“${topic}”` : 'o que está aprendendo'}. O cronômetro continua rodando.
        </p>
      )}
      <div className="stack" aria-live="polite">
        {log.map((x, i) => (
          <div key={i} className="stack" style={{ gap: 'var(--space-2)' }}>
            <p style={{ fontWeight: 600 }}>{x.question}</p>
            {!x.answer && !x.error && <p className="muted">Pensando…</p>}
            {x.answer && (
              <div className="notice stack">
                <AiText text={x.answer} />
                <span className="muted small">Gerado por IA — confira no seu material.</span>
              </div>
            )}
            {x.error && (
              <div className="notice warn stack">
                <span>{x.error}</span>
                {i === log.length - 1 && (
                  <button className="btn" disabled={busy} onClick={() => send(x.question, true)}>
                    Tentar de novo
                  </button>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
      <form className="stack" onSubmit={submit}>
        <label>
          Sua dúvida
          <textarea
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            maxLength={1000}
            placeholder="ex.: Qual a diferença entre função afim e linear?"
          />
        </label>
        <button className="btn primary block" disabled={busy || !question.trim()}>
          {busy ? 'Enviando…' : 'Perguntar'}
        </button>
      </form>
    </section>
  )
}
