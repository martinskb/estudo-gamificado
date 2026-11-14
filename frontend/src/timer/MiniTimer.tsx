import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { activeSeconds, backOf, loadTimer } from './timerState'

/** Faixa com o cronômetro em andamento fora da tela da sessão; leva de volta ao tema ou à trilha. */
export function MiniTimer() {
  const { pathname } = useLocation()
  const [, tick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const timer = loadTimer()
  if (!timer || pathname === '/concluir' || pathname === backOf(timer)) return null

  const seconds = activeSeconds(timer, Date.now())
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')
  return (
    <Link className="mini-timer" to={backOf(timer)}>
      <span className="truncate grow">{timer.pausedAt ? 'Pausado' : 'Estudando'}: {timer.topic}</span>
      <strong>{mm}:{ss}</strong>
    </Link>
  )
}
