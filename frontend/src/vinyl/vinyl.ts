/** Acabamento do disco pelo nível do tema (os nomes vêm da API). */
const FINISH: Record<string, string> = {
  Vinil: 'vinil',
  Prata: 'prata',
  Ouro: 'ouro',
  Platina: 'platina',
  Diamante: 'diamante',
}

export function finishOf(level: string | undefined): string {
  return FINISH[level ?? ''] ?? 'vinil'
}

/** Ângulo do braço: fora do disco quando parado; tocando, vai da borda (0%) ao rótulo (meta cumprida). */
export const ARM_REST = 0
export const ARM_START = 16
export const ARM_END = 36

export function armAngle(progress: number, playing: boolean): number {
  if (!playing) return ARM_REST
  const p = Math.min(1, Math.max(0, progress))
  return ARM_START + (ARM_END - ARM_START) * p
}
