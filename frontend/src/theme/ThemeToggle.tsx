import { useState } from 'react'
import { applyTheme, nextTheme, readTheme } from './theme'

export function ThemeToggle({ className = 'btn ghost small' }: { className?: string }) {
  const [theme, setTheme] = useState(readTheme)
  const dark = theme === 'dark'
  return (
    <button
      type="button"
      className={className}
      aria-label={dark ? 'Usar tema claro' : 'Usar tema escuro'}
      title={dark ? 'Tema claro' : 'Tema escuro'}
      onClick={() => {
        const next = nextTheme(theme)
        applyTheme(next)
        setTheme(next)
      }}
    >
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
        {dark ? (
          <path d="M12 4V2m0 20v-2m8-8h2M2 12h2m13.7-5.7 1.4-1.4M4.9 19.1l1.4-1.4m0-11.4L4.9 4.9m14.2 14.2-1.4-1.4M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" />
        ) : (
          <path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5Z" />
        )}
      </svg>
    </button>
  )
}
