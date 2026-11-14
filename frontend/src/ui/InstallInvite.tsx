import { useState } from 'react'
import { useInstall } from './install'
import { tips } from './tips'

const SHARE_ICON = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-label="Compartilhar" style={{ verticalAlign: '-3px' }}>
    <path d="M12 3v12M8 7l4-4 4 4M6 11H5v10h14V11h-1" />
  </svg>
)

/** Convite para instalar o Lume (instalado, abre sem a barra do navegador). No Início aparece uma vez. */
export function InstallInvite({ once = false }: { once?: boolean }) {
  const { mode, install } = useInstall()
  const [hidden, setHidden] = useState(() => once && !tips.shouldShow('instalar'))
  if (mode === 'none' || hidden) return null

  const close = () => {
    tips.dismiss('instalar')
    setHidden(true)
  }

  return (
    <div className="tip install-invite" role="note">
      <span className="grow">
        {mode === 'prompt' && 'Instale o Lume: ele abre em tela cheia, sem a barra do navegador.'}
        {mode === 'ios' && (
          <>Para abrir em tela cheia: toque em {SHARE_ICON} <strong>Compartilhar</strong> e depois em <strong>Adicionar à Tela de Início</strong>.</>
        )}
        {mode === 'ios-other' && 'Para instalar no iPhone, abra este site no Safari.'}
      </span>
      {mode === 'prompt' && <button className="btn primary small" onClick={install}>Instalar</button>}
      {once && <button className="btn ghost small" onClick={close} aria-label="Fechar convite">{mode === 'prompt' ? 'Agora não' : 'Entendi'}</button>}
    </div>
  )
}
