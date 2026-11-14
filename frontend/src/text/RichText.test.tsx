import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'
import { RichText } from './RichText'

const html = (text: string, inline = false) => renderToStaticMarkup(<RichText text={text} inline={inline} />)

describe('RichText', () => {
  it('renders bold and lists', () => {
    const out = html('**Exemplo:** veja\n\n- um\n- dois')
    expect(out).toContain('<strong>Exemplo:</strong>')
    expect(out).toContain('<li>um</li>')
  })

  it('draws inline and block math with KaTeX', () => {
    expect(html('o valor de $a$ em $f(x) = ax + b$')).toContain('class="katex"')
    expect(html('$$\\frac{1}{2}$$')).toContain('katex-display')
  })

  it('never renders raw HTML from the AI', () => {
    const out = html('oi <script>alert(1)</script> <img src=x onerror=alert(1)>')
    expect(out).not.toContain('<script')
    expect(out).not.toContain('<img')
  })

  it('shows links as plain text, not clickable (the AI must not send people to invented links)', () => {
    const out = html('veja [este site](https://exemplo.com)')
    expect(out).not.toContain('<a')
    expect(out).toContain('este site (https://exemplo.com)')
  })

  it('inline mode has no paragraph wrapper, for quiz questions and options', () => {
    expect(html('V(x) = **2x** + 10', true)).toBe('<span>V(x) = <strong>2x</strong> + 10</span>')
  })

  it('keeps a lone dollar amount as text', () => {
    expect(html('custa R$ 10,00 por km')).toContain('R$ 10,00')
  })
})
