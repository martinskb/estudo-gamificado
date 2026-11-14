import { beforeEach, describe, expect, it, vi } from 'vitest'
import { clearLogin, getToken, saveLogin } from './auth'

describe('auth storage', () => {
  beforeEach(() => {
    const data = new Map<string, string>()
    vi.stubGlobal('localStorage', {
      getItem: (k: string) => data.get(k) ?? null,
      setItem: (k: string, v: string) => void data.set(k, v),
      removeItem: (k: string) => void data.delete(k),
    })
  })

  it('logging out also drops a running timer, so the next person does not inherit it', () => {
    saveLogin('tok', 'ana')
    localStorage.setItem('timer:v1', '{"startedAt":1}')
    clearLogin()
    expect(getToken()).toBeNull()
    expect(localStorage.getItem('timer:v1')).toBeNull()
  })
})
