// Cache "mostra o que tem e atualiza por trás" (stale-while-revalidate).
// Cada resposta fica fresca por um tempo que depende do tipo de dado; depois disso
// continua sendo mostrada na hora, mas a tela busca a versão nova em segundo plano.

type Store = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>
type Entry = { data: unknown; at: number; stale?: boolean }

const KEY = 'api-cache:v1'
const MAX_AGE = 24 * 60 * 60 * 1000 // depois de 1 dia, nem mostra: busca do zero

const RULES: [RegExp, number][] = [
  [/^\/catalog/, 60 * 60 * 1000], // só muda quando geramos temas novos
  [/^\/trails\/\d+$/, 10 * 60 * 1000], // trilha pronta quase não muda
  [/^\/ranking/, 60 * 1000], // muda com o estudo dos outros
]

/** Quanto tempo uma resposta conta como "fresca" (sem buscar de novo). */
export function freshFor(path: string): number {
  return RULES.find(([re]) => re.test(path))?.[1] ?? 30 * 1000 // galeria, tema, progresso
}

export function createCache(store: Store | null, now: () => number = Date.now) {
  let entries: Record<string, Entry> = {}
  try {
    entries = JSON.parse(store?.getItem(KEY) ?? '{}') ?? {}
  } catch {
    entries = {}
  }

  function persist() {
    try {
      store?.setItem(KEY, JSON.stringify(entries))
    } catch {
      // armazenamento cheio ou bloqueado: o cache segue só em memória
    }
  }

  return {
    get(path: string): { data: unknown; fresh: boolean } | null {
      const entry = entries[path]
      if (!entry || now() - entry.at > MAX_AGE) return null
      return { data: entry.data, fresh: !entry.stale && now() - entry.at <= freshFor(path) }
    },
    set(path: string, data: unknown) {
      entries[path] = { data, at: now() }
      persist()
    },
    markAllStale() {
      for (const entry of Object.values(entries)) entry.stale = true
      persist()
    },
    clear() {
      entries = {}
      try {
        store?.removeItem(KEY)
      } catch {
        // nada a limpar
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

export const apiCache = createCache(safeStorage())
