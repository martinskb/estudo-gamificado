/** Símbolo "Vinil": um disco com o rótulo âmbar aceso. */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="11" fill="#0b0a09" />
      <circle cx="12" cy="12" r="8.6" fill="none" stroke="#2c2722" strokeWidth="0.6" />
      <circle cx="12" cy="12" r="6.6" fill="none" stroke="#2c2722" strokeWidth="0.6" />
      <circle cx="12" cy="12" r="4" fill="#e9a73c" />
      <circle cx="12" cy="12" r="1" fill="#0b0a09" />
    </svg>
  )
}

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <span className="brand" role="img" aria-label="Lume">
      <LogoMark size={size} />
      <span className="brand-word" style={{ fontSize: size * 0.85 }} aria-hidden="true">lume</span>
    </span>
  )
}
