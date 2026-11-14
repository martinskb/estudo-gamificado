import { useEffect, useState } from 'react'

export type InstallMode = 'none' | 'prompt' | 'ios' | 'ios-other'

/** Que convite de instalação mostrar (instalado como app, o Lume abre sem a barra do navegador). */
export function installMode({ ua, standalone, canPrompt }: { ua: string; standalone: boolean; canPrompt: boolean }): InstallMode {
  if (standalone) return 'none'
  if (canPrompt) return 'prompt'
  if (/iPhone|iPad|iPod/.test(ua)) return /CriOS|FxiOS|EdgiOS|OPiOS/.test(ua) ? 'ios-other' : 'ios'
  return 'none'
}

type PromptEvent = Event & { prompt: () => Promise<void>; userChoice: Promise<{ outcome: string }> }

// O Chrome avisa uma vez, logo ao abrir, que dá para instalar: guardamos o aviso para usar no botão.
let deferred: PromptEvent | null = null
const listeners = new Set<() => void>()
if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault()
    deferred = e as PromptEvent
    listeners.forEach((l) => l())
  })
  window.addEventListener('appinstalled', () => {
    deferred = null
    listeners.forEach((l) => l())
  })
}

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || (navigator as { standalone?: boolean }).standalone === true

export function useInstall() {
  const [, rerender] = useState(0)
  useEffect(() => {
    const l = () => rerender((n) => n + 1)
    listeners.add(l)
    return () => void listeners.delete(l)
  }, [])
  const mode = installMode({ ua: navigator.userAgent, standalone: isStandalone(), canPrompt: deferred !== null })
  async function install() {
    if (!deferred) return
    await deferred.prompt()
    await deferred.userChoice
    deferred = null
    rerender((n) => n + 1)
  }
  return { mode, install }
}
