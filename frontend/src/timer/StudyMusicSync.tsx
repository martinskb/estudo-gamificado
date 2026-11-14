import { useEffect } from 'react'
import { player } from '../local/studyMusic'
import { loadTimer } from './timerState'

/** Mantém as músicas para estudar em sincronia com o disco (sessão tocando = música tocando). */
export function StudyMusicSync() {
  useEffect(() => {
    void player.prepare() // deixa a primeira música carregada antes do toque em Tocar
    const check = () => {
      const t = loadTimer()
      player.sync(t !== null && t.pausedAt === null)
    }
    check()
    const id = setInterval(check, 1000)
    // Ao reabrir com o disco girando, o navegador só libera o som depois de um toque: qualquer toque serve.
    const unlock = () => player.refresh()
    document.addEventListener('pointerdown', unlock, true)
    return () => {
      clearInterval(id)
      document.removeEventListener('pointerdown', unlock, true)
      player.sync(false)
    }
  }, [])
  return null
}
