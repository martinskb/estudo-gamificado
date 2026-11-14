import 'katex/dist/katex.min.css'
import Markdown, { type Components } from 'react-markdown'
import rehypeKatex from 'rehype-katex'
import remarkGfm from 'remark-gfm'
import remarkMath from 'remark-math'

// Texto gerado pela IA: markdown simples + fórmulas ($…$ e $$…$$).
// HTML cru nunca é renderizado (react-markdown o ignora por padrão) e links viram texto,
// porque a IA não deve mandar ninguém para endereços que ela possa ter inventado.
const components: Components = {
  a: ({ children, href }) => (
    <span>
      {children}
      {href && href !== String(children) ? ` (${href})` : ''}
    </span>
  ),
  img: ({ alt }) => <span>{alt}</span>,
}

const inlineComponents: Components = {
  ...components,
  p: ({ children }) => <>{children}</>,
}

const remarkPlugins = [remarkGfm, [remarkMath, { singleDollarTextMath: true }]] as never
const rehypePlugins = [[rehypeKatex, { throwOnError: false, strict: 'ignore' }]] as never

type Props = { text: string; inline?: boolean }

export function RichText({ text, inline = false }: Props) {
  const markdown = (
    <Markdown
      remarkPlugins={remarkPlugins}
      rehypePlugins={rehypePlugins}
      components={inline ? inlineComponents : components}
      skipHtml
    >
      {prepare(text)}
    </Markdown>
  )
  return inline ? <span>{markdown}</span> : <div className="rich-text">{markdown}</div>
}

function prepare(text: string): string {
  return (
    text
      // "R$ 10" não é fórmula: escapa o cifrão de valores em reais.
      .replace(/R\$(?=\s?\d)/g, 'R\\$')
      // $$…$$ na mesma linha vira fórmula em destaque (bloco), como a IA costuma escrever.
      .replace(/\$\$([\s\S]+?)\$\$/g, (_, formula: string) => `\n\n$$\n${formula.trim()}\n$$\n\n`)
  )
}
