import type { CSSProperties } from 'react'
import type { Topic } from '../api/types'
import { PALETTES } from './cover'

const LEVEL_DOT: Record<string, number> = { Vinil: 4, Prata: 6, Ouro: 8, Platina: 10, Diamante: 12 }

type Props = { topic: Pick<Topic, 'title' | 'palette' | 'cover' | 'level'>; size?: 'grid' | 'hero'; showTitle?: boolean }

/** Capa do tema. Com foto: duotone nas cores da paleta. Sem foto: cor + degraus da marca. */
export function Cover({ topic, size = 'grid', showTitle = true }: Props) {
  const palette = PALETTES[topic.palette] ?? PALETTES.indigo
  const style = { '--cover-dark': palette.dark, '--cover-light': palette.light } as CSSProperties
  const dot = LEVEL_DOT[topic.level.name] ?? 4
  return (
    <div className={`cover cover-${size}${topic.cover ? ' has-photo' : ''}`} style={style}>
      {topic.cover && <img src={topic.cover} alt="" draggable={false} style={{ filter: `url(#duo-${topic.palette}) contrast(1.08)` }} />}
      <svg className="cover-steps" viewBox="0 0 64 64" aria-hidden="true">
        <path d="M6 58 H24 M18 44 H40 M34 30 H58" strokeWidth="6" strokeLinecap="round" fill="none" />
        <circle cx="56" cy="12" r="6" />
      </svg>
      {topic.level.name !== 'Vinil' && (
        <span className="cover-level">
          <i style={{ width: dot, height: dot }} aria-hidden="true" />
          {topic.level.name}
        </span>
      )}
      {showTitle && <span className="cover-title">{topic.title}</span>}
    </div>
  )
}
