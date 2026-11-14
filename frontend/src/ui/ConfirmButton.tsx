import { useEffect, useState } from 'react'

type Props = {
  label: string
  confirmLabel: string
  onConfirm: () => void
  className?: string
  disabled?: boolean
  skipConfirm?: boolean
}

/** Ação destrutiva em dois toques, sem o pop-up do navegador: o primeiro toque pede confirmação. */
export function ConfirmButton({ label, confirmLabel, onConfirm, className = 'btn ghost block', disabled, skipConfirm }: Props) {
  const [armed, setArmed] = useState(false)

  useEffect(() => {
    if (!armed) return
    const id = setTimeout(() => setArmed(false), 5000) // desarma sozinho se a pessoa desistir
    return () => clearTimeout(id)
  }, [armed])

  if (!armed) {
    return (
      <button className={className} disabled={disabled} onClick={() => (skipConfirm ? onConfirm() : setArmed(true))}>
        {label}
      </button>
    )
  }
  return (
    <div className="confirm-row" role="group" aria-label={confirmLabel}>
      <button className="btn danger grow" onClick={onConfirm} autoFocus>{confirmLabel}</button>
      <button className="btn ghost" onClick={() => setArmed(false)}>Cancelar</button>
    </div>
  )
}
