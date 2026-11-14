import { describe, expect, it } from 'vitest'
import { isAudioFile, shuffle, trackTitle } from './studyMusic'

describe('study music files', () => {
  it('accepts audio by type or by extension', () => {
    expect(isAudioFile('lofi.mp3', 'audio/mpeg')).toBe(true)
    expect(isAudioFile('chuva.m4a', '')).toBe(true)
    expect(isAudioFile('foto.jpg', 'image/jpeg')).toBe(false)
    expect(isAudioFile('notas.txt', '')).toBe(false)
  })

  it('turns the file name into a title', () => {
    expect(trackTitle('02 - Lofi tranquilo.mp3')).toBe('02 - Lofi tranquilo')
    expect(trackTitle('piano_calmo.flac')).toBe('piano calmo')
    expect(trackTitle('.mp3')).toBe('Música')
  })
})

describe('shuffle', () => {
  it('keeps every track exactly once', () => {
    const out = shuffle([1, 2, 3, 4, 5])
    expect([...out].sort()).toEqual([1, 2, 3, 4, 5])
  })

  it('is deterministic with a fixed random source', () => {
    expect(shuffle([1, 2, 3], () => 0)).toEqual([2, 3, 1])
  })
})
