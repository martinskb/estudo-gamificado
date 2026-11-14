export type Theme = 'light' | 'dark'

type Store = Pick<Storage, 'getItem' | 'setItem'>

/** O claro é o padrão; o escuro só quando a pessoa escolhe. */
export function readTheme(store: Store | null = safeStorage()): Theme {
  try {
    return store?.getItem('theme') === 'dark' ? 'dark' : 'light'
  } catch {
    return 'light'
  }
}

export const nextTheme = (t: Theme): Theme => (t === 'dark' ? 'light' : 'dark')

export function applyTheme(theme: Theme, store: Store | null = safeStorage()): void {
  document.documentElement.dataset.theme = theme
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', theme === 'dark' ? '#0e0d1c' : '#3d3bb8')
  try {
    store?.setItem('theme', theme)
  } catch {
    // sem armazenamento: vale só até recarregar
  }
}

function safeStorage(): Store | null {
  try {
    return localStorage
  } catch {
    return null
  }
}
