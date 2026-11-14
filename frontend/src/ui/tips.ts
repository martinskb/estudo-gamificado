type Store = Pick<Storage, 'getItem' | 'setItem'>
const KEY = 'tips:seen'

/** Dicas que aparecem uma vez: depois de "Entendi", não voltam mais. */
export function createTips(store: Store | null) {
  let seen = new Set<string>()
  try {
    seen = new Set(JSON.parse(store?.getItem(KEY) ?? '[]'))
  } catch {
    seen = new Set()
  }
  return {
    shouldShow: (id: string) => !seen.has(id),
    dismiss(id: string) {
      seen.add(id)
      try {
        store?.setItem(KEY, JSON.stringify([...seen]))
      } catch {
        // sem armazenamento: some só até recarregar
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

export const tips = createTips(safeStorage())
