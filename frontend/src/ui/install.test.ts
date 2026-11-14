import { describe, expect, it } from 'vitest'
import { installMode } from './install'

const ANDROID = 'Mozilla/5.0 (Linux; Android 14; SM-S918B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Mobile Safari/537.36'
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1'
const IPHONE_CHROME = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/131.0 Mobile/15E148 Safari/604.1'
const DESKTOP = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0 Safari/537.36'

describe('installMode', () => {
  it('already installed: offer nothing', () => {
    expect(installMode({ ua: ANDROID, standalone: true, canPrompt: true })).toBe('none')
  })
  it('Android Chrome with the install event: one-tap button', () => {
    expect(installMode({ ua: ANDROID, standalone: false, canPrompt: true })).toBe('prompt')
  })
  it('iPhone Safari: show the Share → Add to Home Screen steps', () => {
    expect(installMode({ ua: IPHONE, standalone: false, canPrompt: false })).toBe('ios')
  })
  it('iPhone in another browser: tell to open in Safari', () => {
    expect(installMode({ ua: IPHONE_CHROME, standalone: false, canPrompt: false })).toBe('ios-other')
  })
  it('desktop or no install event: nothing on Home (computer does not need it)', () => {
    expect(installMode({ ua: DESKTOP, standalone: false, canPrompt: false })).toBe('none')
    expect(installMode({ ua: ANDROID, standalone: false, canPrompt: false })).toBe('none')
  })
})
