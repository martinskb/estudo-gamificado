export const GOAL_PRESETS = [15, 25, 45, 60]

/** Minutos digitados → número válido (1 a 600) ou null enquanto o campo está vazio/inválido. */
export function parseGoal(raw: string): number | null {
  const text = raw.trim()
  if (!/^\d{1,3}$/.test(text)) return null
  const minutes = Number(text)
  return minutes >= 1 && minutes <= 600 ? minutes : null
}
