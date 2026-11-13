import { useEffect, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { activeSeconds, loadTimer } from './timerState'

/** Faixa com o cronômetro em andamento, para acompanhar o tempo enquanto assiste à aula. */
export function MiniTimer() {
  const { pathname } = useLocation()
  const [, tick] = useState(0)

  useEffect(() => {
    const id = setInterval(() => tick((n) => n + 1), 1000)
    return () => clearInterval(id)
  }, [])

  const timer = loadTimer()
  if (!timer || pathname === '/estudar') return null

  const seconds = activeSeconds(timer, Date.now())
  const mm = String(Math.floor(seconds / 60)).padStart(2, '0')
  const ss = String(seconds % 60).padStart(2, '0')
  return (
    <Link className="mini-timer" to="/estudar">
      <span className="truncate grow">{timer.pausedAt ? 'Pausado' : 'Estudando'}: {timer.topic}</span>
      <strong>{mm}:{ss}</strong>
    </Link>
  )
}
