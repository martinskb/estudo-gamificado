import { useEffect, useSyncExternalStore } from 'react'
import { api } from '../api/client'
import { deviceStore, keepOnDevice } from './deviceStore'

// Fotos das capas: só neste aparelho. Ficam em memória para a estante desenhar sem esperar.
const covers = new Map<number, string>()
const listeners = new Set<() => void>()
let loaded: Promise<void> | null = null

const emit = () => listeners.forEach((l) => l())

function loadAll(): Promise<void> {
  if (!loaded) {
    loaded = Promise.all([deviceStore.keys('covers'), deviceStore.all<string>('covers')])
      .then(([keys, values]) => {
        keys.forEach((k, i) => covers.set(Number(k), values[i]))
        emit()
      })
      .catch(() => {}) // aba anônima/armazenamento bloqueado: segue com as capas geradas
  }
  return loaded
}

function subscribe(l: () => void) {
  listeners.add(l)
  void loadAll()
  return () => void listeners.delete(l)
}

/** Foto da capa deste tema guardada no aparelho (ou null). */
export function useDeviceCover(topicId: number | undefined): string | null {
  return useSyncExternalStore(subscribe, () => (topicId === undefined ? null : covers.get(topicId) ?? null))
}

export async function saveCover(topicId: number, dataUrl: string): Promise<void> {
  await deviceStore.put('covers', dataUrl, topicId)
  keepOnDevice()
  covers.set(topicId, dataUrl)
  emit()
}

export async function removeCover(topicId: number): Promise<void> {
  await deviceStore.remove('covers', topicId)
  covers.delete(topicId)
  emit()
}

type WithCover = { id: number; cover: string | null }
const moving = new Set<number>()
const cleared = new Set<number>() // já apagadas do servidor nesta abertura

/** Fotos antigas que ainda estão no servidor: copia para o aparelho e só então apaga de lá. */
export async function adoptServerCovers(topics: WithCover[]): Promise<void> {
  for (const t of topics) {
    if (!t.cover || moving.has(t.id) || cleared.has(t.id)) continue
    moving.add(t.id)
    try {
      await loadAll()
      if (!covers.has(t.id)) await saveCover(t.id, t.cover)
      await api(`/topics/${t.id}`, { method: 'PATCH', body: JSON.stringify({ cover: null }) })
      cleared.add(t.id)
    } catch {
      // sem espaço ou sem rede: tenta de novo na próxima abertura, sem perder a foto
    } finally {
      moving.delete(t.id)
    }
  }
}

/** Atalho para as telas que listam temas: traz as fotos antigas quando a lista chega. */
export function useAdoptServerCovers(topics: WithCover[] | null | undefined): void {
  useEffect(() => {
    if (topics?.some((t) => t.cover)) void adoptServerCovers(topics)
  }, [topics])
}
