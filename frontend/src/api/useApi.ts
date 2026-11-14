import { useCallback, useEffect, useState } from 'react'
import { apiCache } from './cache'
import { api } from './client'

/**
 * Busca `path` com cache: mostra na hora a última versão salva (se houver) e, quando ela
 * já não é fresca, busca a nova por trás. `reload()` força a busca.
 */
export function useApi<T>(path: string | null) {
  const [data, setDataState] = useState<T | null>(() => (path ? ((apiCache.get(path)?.data as T) ?? null) : null))
  const [error, setError] = useState('')
  const [tick, setTick] = useState(0)

  useEffect(() => {
    if (path === null) return
    let cancelled = false
    const cached = apiCache.get(path)
    setDataState((cached?.data as T) ?? null)
    setError('')
    if (cached?.fresh && tick === 0) return
    api<T>(path)
      .then((d) => {
        apiCache.set(path, d)
        if (!cancelled) setDataState(d)
      })
      .catch((e) => {
        // com dado salvo na tela, um erro de rede não apaga nada: só não atualiza
        if (!cancelled && !cached) setError(e instanceof Error ? e.message : 'Erro ao carregar.')
      })
    return () => {
      cancelled = true
    }
  }, [path, tick])

  const reload = useCallback(() => setTick((t) => t + 1), [])
  const setData = useCallback(
    (value: T) => {
      if (path) apiCache.set(path, value)
      setDataState(value)
    },
    [path],
  )
  return { data, error, reload, setData, loading: data === null && !error }
}
