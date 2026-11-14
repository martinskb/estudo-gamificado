import { Suspense, lazy } from 'react'

// KaTeX e o leitor de markdown são grandes: só carregam quando aparece texto da IA.
const RichText = lazy(() => import('./RichText').then((m) => ({ default: m.RichText })))

export function AiText({ text, inline = false }: { text: string; inline?: boolean }) {
  return (
    <Suspense fallback={<span style={{ whiteSpace: 'pre-wrap' }}>{text}</span>}>
      <RichText text={text} inline={inline} />
    </Suspense>
  )
}
