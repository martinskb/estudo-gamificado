import { clearLogin, getToken } from '../auth/auth'
import { apiCache } from './cache'

const BASE = (import.meta.env.VITE_API_URL ?? 'http://localhost:8000').replace(/\/$/, '')

export class ApiError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export async function api<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = getToken()
  let res: Response
  try {
    res = await fetch(BASE + path, {
      ...init,
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...init.headers,
      },
    })
  } catch {
    throw new ApiError(0, 'Sem conexão com o servidor. Tente de novo.')
  }
  if (res.status === 401 && path !== '/auth/enter') {
    clearLogin()
    window.location.assign('/entrar')
  }
  if (!res.ok) {
    let detail = 'Algo deu errado. Tente de novo.'
    try {
      const body = await res.json()
      if (typeof body.detail === 'string') detail = body.detail
    } catch {
      // resposta sem JSON
    }
    throw new ApiError(res.status, detail)
  }
  // qualquer mudança (sessão, tema, capa…) faz as telas buscarem a versão nova na próxima vez
  if ((init.method ?? 'GET') !== 'GET') apiCache.markAllStale()
  if (res.status === 204) return undefined as T
  return res.json() as Promise<T>
}

export const post = <T>(path: string, body?: unknown) =>
  api<T>(path, { method: 'POST', body: body === undefined ? undefined : JSON.stringify(body) })

export const put = <T>(path: string, body: unknown) =>
  api<T>(path, { method: 'PUT', body: JSON.stringify(body) })
