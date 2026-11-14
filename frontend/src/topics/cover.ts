export type PaletteName = 'indigo' | 'noite' | 'lilas' | 'coral' | 'verde' | 'sol'

/** Paletas do duotone: a foto vira duas cores da marca (escuro → dark, claro → light). */
export const PALETTES: Record<PaletteName, { label: string; dark: string; light: string }> = {
  indigo: { label: 'Índigo e amarelo', dark: '#2a2890', light: '#ffd43b' },
  noite: { label: 'Noite e lilás', dark: '#1c1b33', light: '#a9a6ff' },
  lilas: { label: 'Índigo e lilás', dark: '#3d3bb8', light: '#e8e7fb' },
  coral: { label: 'Noite e coral', dark: '#1c1b33', light: '#ff9a6c' },
  verde: { label: 'Mata e menta', dark: '#123f35', light: '#8ce99a' },
  sol: { label: 'Índigo e sol', dark: '#3d3bb8', light: '#fff3bf' },
}

export function centerSquare(width: number, height: number) {
  const size = Math.min(width, height)
  return { sx: Math.round((width - size) / 2), sy: Math.round((height - size) / 2), size }
}

export function formatHours(seconds: number): string {
  const minutes = Math.floor(seconds / 60)
  if (minutes < 60) return `${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `${h} h ${String(m).padStart(2, '0')}` : `${h} h`
}

const SIDE = 320
const MAX_CHARS = 95_000

/** Recorta o meio da foto em quadrado e reduz para 320 px, no próprio aparelho, antes de enviar. */
export async function photoToCover(file: File): Promise<string> {
  const bitmap = await createImageBitmap(file)
  const { sx, sy, size } = centerSquare(bitmap.width, bitmap.height)
  const canvas = document.createElement('canvas')
  canvas.width = SIDE
  canvas.height = SIDE
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Não deu para ler a foto.')
  ctx.drawImage(bitmap, sx, sy, size, size, 0, 0, SIDE, SIDE)
  bitmap.close?.()
  for (const quality of [0.82, 0.7, 0.55, 0.4]) {
    const url = canvas.toDataURL('image/jpeg', quality)
    if (url.length <= MAX_CHARS) return url
  }
  throw new Error('A foto ficou grande demais. Tente outra.')
}

const channel = (hex: string, i: number) => (parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255).toFixed(4).replace(/\.?0+$/, '')

/** Tabelas do feComponentTransfer: cinza 0 → cor escura, cinza 1 → cor clara (duotone exato). */
export function duotoneTables(dark: string, light: string) {
  return {
    r: `${channel(dark, 0)} ${channel(light, 0)}`,
    g: `${channel(dark, 1)} ${channel(light, 1)}`,
    b: `${channel(dark, 2)} ${channel(light, 2)}`,
  }
}
