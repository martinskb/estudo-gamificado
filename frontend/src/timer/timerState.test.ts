import { describe, expect, it } from 'vitest'
import { activeSeconds, backOf, loadTimer, pause, resume, saveTimer, startTimer } from './timerState'

const T0 = 1_800_000_000_000
const at = (seconds: number) => T0 + seconds * 1000

function fakeStorage(): Storage {
  const data = new Map<string, string>()
  return {
    getItem: (k) => data.get(k) ?? null,
    setItem: (k, v) => void data.set(k, v),
    removeItem: (k) => void data.delete(k),
    clear: () => data.clear(),
    key: () => null,
    get length() {
      return data.size
    },
  }
}

describe('timerState', () => {
  it('counts seconds since start', () => {
    const s = startTimer('Cálculo', 25, null, T0)
    expect(activeSeconds(s, at(90))).toBe(90)
  })

  it('excludes paused time after resuming', () => {
    let s = startTimer('Cálculo', 25, null, T0)
    s = pause(s, at(60))
    s = resume(s, at(120))
    expect(activeSeconds(s, at(180))).toBe(120)
  })

  it('stays frozen while paused', () => {
    const s = pause(startTimer('Cálculo', 25, null, T0), at(60))
    expect(activeSeconds(s, at(300))).toBe(60)
  })

  it('ignores a second pause and a resume when not paused', () => {
    let s = startTimer('Cálculo', 25, null, T0)
    s = resume(s, at(10))
    s = pause(s, at(60))
    s = pause(s, at(90))
    expect(activeSeconds(s, at(200))).toBe(60)
  })

  it('survives reload', () => {
    const storage = fakeStorage()
    const s = pause(startTimer('Cálculo', 25, 7, T0), at(60))
    saveTimer(resume(s, at(120)), storage)
    const loaded = loadTimer(storage)
    expect(loaded).toEqual(resume(s, at(120)))
    expect(activeSeconds(loaded!, at(180))).toBe(120)
  })

  it('clears with null and tolerates corrupted storage', () => {
    const storage = fakeStorage()
    saveTimer(startTimer('Cálculo', 25, null, T0), storage)
    saveTimer(null, storage)
    expect(loadTimer(storage)).toBeNull()
    storage.setItem('timer:v1', '{not json')
    expect(loadTimer(storage)).toBeNull()
  })
})

describe('timer linked to a topic', () => {
  it('keeps the topic id so the session lands in the right playlist', () => {
    const s = startTimer('Inglês', 25, null, T0, 7)
    expect(s.topicId).toBe(7)
    expect(startTimer('Livre', 25, null, T0).topicId).toBeNull()
  })
})

describe('where the session lives', () => {
  it('remembers the screen that started it', () => {
    expect(backOf(startTimer('Inglês', 25, null, T0, 7, '/tema/7'))).toBe('/tema/7')
  })
  it('sends old sessions without a screen to the summary', () => {
    const { back: _, ...old } = startTimer('Inglês', 25, null, T0, 7)
    expect(backOf(old)).toBe('/concluir')
  })
})
