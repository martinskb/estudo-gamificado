import { type MouseEvent, type PointerEvent, useRef } from 'react'

const HOLD_MS = 480
const SLOP_PX = 10

/** Segurar (celular) ou botão direito (computador) abre um menu do app no lugar do menu do navegador. */
export function useLongPress(onLongPress: () => void) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const start = useRef<{ x: number; y: number } | null>(null)
  const fired = useRef(false)

  const cancel = () => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = null
    start.current = null
  }
  const fire = () => {
    cancel()
    fired.current = true
    navigator.vibrate?.(12)
    onLongPress()
  }

  return {
    onPointerDown: (e: PointerEvent) => {
      if (e.pointerType === 'mouse' && e.button !== 0) return
      fired.current = false
      start.current = { x: e.clientX, y: e.clientY }
      timer.current = setTimeout(fire, HOLD_MS)
    },
    onPointerMove: (e: PointerEvent) => {
      // rolando a prateleira não é segurar
      if (start.current && Math.hypot(e.clientX - start.current.x, e.clientY - start.current.y) > SLOP_PX) cancel()
    },
    onPointerUp: cancel,
    onPointerLeave: cancel,
    onPointerCancel: cancel,
    onContextMenu: (e: MouseEvent) => {
      e.preventDefault()
      if (!fired.current) fire()
    },
    // depois de segurar, soltar o dedo não deve abrir o tema
    onClickCapture: (e: MouseEvent) => {
      if (fired.current) {
        e.preventDefault()
        e.stopPropagation()
        fired.current = false
      }
    },
  }
}
