import { useEffect } from 'react'
import { playSound } from '../ui/sound'
import { shouldSignalGoal } from './goalSignal'
import { loadTimer } from './timerState'

/** Meta cumprida: som suave e vibração uma vez, em qualquer tela do app (o brilho fica na tela da sessão). */
export function GoalSignal() {
  useEffect(() => {
    const id = setInterval(() => {
      const t = loadTimer()
      if (!t || !shouldSignalGoal(t, Date.now())) return
      playSound('goal')
      navigator.vibrate?.([70, 60, 70])
    }, 1000)
    return () => clearInterval(id)
  }, [])
  return null
}
