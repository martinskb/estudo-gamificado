/** Símbolo "Degraus de luz": três degraus que sobem até um ponto de luz. */
export function LogoMark({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" focusable="false">
      <rect width="64" height="64" rx="16" fill="#3d3bb8" />
      <path d="M13 48 H25 M23 38 H37 M33 28 H47" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
      <circle cx="49" cy="16" r="5.5" fill="#ffd43b" />
      <path
        d="M49 6.5 V8 M58.5 16 H57 M55.7 9.3 L54.6 10.4"
        stroke="#ffd43b"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function Logo({ size = 32 }: { size?: number }) {
  return (
    <span className="brand" role="img" aria-label="Lume">
      <LogoMark size={size} />
      <span className="brand-word" style={{ fontSize: size * 0.8 }} aria-hidden="true">lume</span>
    </span>
  )
}
