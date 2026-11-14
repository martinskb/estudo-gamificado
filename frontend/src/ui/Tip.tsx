import { type ReactNode, useState } from 'react'
import { tips } from './tips'

/** Explicação curta que aparece só na primeira vez. */
export function Tip({ id, children }: { id: string; children: ReactNode }) {
  const [show, setShow] = useState(() => tips.shouldShow(id))
  if (!show) return null
  return (
    <div className="tip" role="note">
      <span className="grow">{children}</span>
      <button
        className="btn ghost small"
        onClick={() => {
          tips.dismiss(id)
          setShow(false)
        }}
      >
        Entendi
      </button>
    </div>
  )
}
