// Sons curtos, gerados pelo navegador (nenhum arquivo para baixar), só nos momentos de vitória.

type Store = Pick<Storage, 'getItem' | 'setItem'>
export type SoundKind = 'complete' | 'streak' | 'right' | 'wrong'

export function createSoundSetting(store: Store | null) {
  let on = true
  try {
    on = store?.getItem('sound') !== 'off'
  } catch {
    on = true
  }
  return {
    enabled: () => on,
    set(value: boolean) {
      on = value
      try {
        store?.setItem('sound', value ? 'on' : 'off')
      } catch {
        // sem armazenamento: vale até recarregar
      }
    },
  }
}

function safeStorage(): Store | null {
  try {
    return localStorage
  } catch {
    return null
  }
}

export const soundSetting = createSoundSetting(safeStorage())

let ctx: AudioContext | null = null

function context(): AudioContext | null {
  if (typeof window === 'undefined' || !('AudioContext' in window)) return null
  ctx ??= new AudioContext()
  return ctx
}

// O navegador só libera áudio depois de um toque: destrava no primeiro toque da página.
if (typeof document !== 'undefined') {
  document.addEventListener('pointerdown', () => void context()?.resume(), { once: true, capture: true })
}

// notas (Hz), quando começa (s) e duração (s)
const MELODIES: Record<SoundKind, [number, number, number][]> = {
  complete: [[659.3, 0, 0.18], [987.8, 0.1, 0.32]],
  streak: [[523.3, 0, 0.16], [659.3, 0.09, 0.16], [784, 0.18, 0.16], [1046.5, 0.27, 0.45]],
  right: [[880, 0, 0.12], [1318.5, 0.07, 0.22]],
  wrong: [[311.1, 0, 0.18], [233.1, 0.12, 0.26]],
}

export function playSound(kind: SoundKind): void {
  if (!soundSetting.enabled()) return
  const ac = context()
  if (!ac || ac.state !== 'running') return
  const start = ac.currentTime + 0.02
  for (const [freq, at, dur] of MELODIES[kind]) {
    const osc = ac.createOscillator()
    const gain = ac.createGain()
    osc.type = kind === 'wrong' ? 'triangle' : 'sine'
    osc.frequency.value = freq
    gain.gain.setValueAtTime(0, start + at)
    gain.gain.linearRampToValueAtTime(0.12, start + at + 0.015) // volume baixo
    gain.gain.exponentialRampToValueAtTime(0.0001, start + at + dur)
    osc.connect(gain).connect(ac.destination)
    osc.start(start + at)
    osc.stop(start + at + dur + 0.05)
  }
}
