import { useInstall } from './install'

/** Linha discreta no Perfil para instalar o Lume (abre sem a barra do navegador). */
export function InstallRow() {
  const { mode, install } = useInstall()
  if (mode === 'none') return null

  return (
    <div className="install-row">
      <span className="stack" style={{ gap: 2 }}>
        <span>Instalar o app</span>
        {mode === 'ios' && <span className="muted small">Compartilhar › Adicionar à Tela de Início</span>}
        {mode === 'ios-other' && <span className="muted small">Abra no Safari para instalar</span>}
      </span>
      {mode === 'prompt' && <button className="btn soft small" onClick={install}>Instalar</button>}
    </div>
  )
}
