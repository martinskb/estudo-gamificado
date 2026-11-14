import { type FormEvent, type KeyboardEvent, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { postStream } from '../api/client'
import { AiText } from '../text/LazyRichText'

type Exchange = { question: string; answer?: string; error?: string }

/** Ícone discreto de dúvida; abre um painel por cima da tela (não empurra nada, não mexe no cronômetro). */
export function AssistantPanel({ topic }: { topic?: string }) {
  const [open, setOpen] = useState(false)
  const [question, setQuestion] = useState('')
  const [log, setLog] = useState<Exchange[]>([])
  const [busy, setBusy] = useState(false)
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' })
  }, [log])

  useEffect(() => {
    if (!open) return
    const onKey = (e: globalThis.KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  async function send(text: string, replaceLast = false) {
    setBusy(true)
    setLog((l) => [...(replaceLast ? l.slice(0, -1) : l), { question: text }])
    const finish = (patch: Partial<Exchange>) =>
      setLog((l) => [...l.slice(0, -1), { question: text, ...patch }])
    try {
      // A resposta aparece enquanto a IA escreve.
      const answer = await postStream('/assistant/stream', { question: text, topic: topic || null }, (soFar) =>
        finish({ answer: soFar }),
      )
      finish({ answer: answer.trim() })
    } catch (err) {
      finish({ error: err instanceof Error ? err.message : 'Assistente indisponível.' })
    } finally {
      setBusy(false)
    }
  }

  function submit(e?: FormEvent) {
    e?.preventDefault()
    const text = question.trim()
    if (!text || busy) return
    setQuestion('')
    void send(text)
  }

  // No computador, Enter envia e Shift+Enter quebra a linha.
  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey && window.matchMedia('(pointer: fine)').matches) {
      e.preventDefault()
      submit()
    }
  }

  return (
    <>
      <button className="ask-icon" onClick={() => setOpen(true)} aria-label="Tirar uma dúvida com a IA" aria-expanded={open}>
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M4 5h16v11H9l-5 4z" />
          <path d="M10 9.5a2 2 0 1 1 2.5 2c-.5.2-.5.6-.5 1" />
        </svg>
      </button>

      {open && createPortal(
        <div className="ask-layer" onClick={() => setOpen(false)}>
          <section className="ask-sheet" role="dialog" aria-label="Tirar uma dúvida" onClick={(e) => e.stopPropagation()}>
            <button className="ask-close" onClick={() => setOpen(false)} aria-label="Fechar">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
            </button>

            {log.length > 0 && (
              <div className="ask-log" aria-live="polite">
                {log.map((x, i) => (
                  <div key={i} className="ask-turn">
                    <p className="ask-q">{x.question}</p>
                    {!x.answer && !x.error && <p className="muted small">Pensando…</p>}
                    {x.answer && (
                      <div className="ask-a">
                        <AiText text={x.answer} />
                        <span className="muted small">Gerado por IA. Confira no seu material.</span>
                      </div>
                    )}
                    {x.error && (
                      <p className="ask-a error">
                        {x.error}{' '}
                        {i === log.length - 1 && (
                          <button className="link-btn" disabled={busy} onClick={() => send(x.question, true)}>Tentar de novo</button>
                        )}
                      </p>
                    )}
                  </div>
                ))}
                <div ref={endRef} />
              </div>
            )}

            <form className="ask-form" onSubmit={submit}>
              <textarea
                value={question}
                onChange={(e) => setQuestion(e.target.value)}
                onKeyDown={onKeyDown}
                maxLength={1000}
                rows={1}
                placeholder="Qual a sua dúvida?"
                aria-label={topic ? `Sua dúvida sobre ${topic}` : 'Sua dúvida'}
                autoFocus
              />
              <button className="ask-send" disabled={busy || !question.trim()} aria-label="Enviar">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" /></svg>
              </button>
            </form>
          </section>
        </div>,
        document.body,
      )}
    </>
  )
}
