import { PALETTES, type PaletteName } from '../topics/cover'

export function initial(nickname: string): string {
  const letter = nickname.match(/[A-Za-zÀ-ÿ]/)?.[0] ?? nickname[0] ?? '?'
  return letter.toUpperCase()
}

/** Cor fixa por apelido (sem foto: no ranking cada pessoa é um círculo com a inicial). */
export function avatarPalette(nickname: string) {
  const names = Object.keys(PALETTES) as PaletteName[]
  let hash = 0
  for (const ch of nickname.toLowerCase()) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0
  return PALETTES[names[hash % names.length]]
}
