import type { CSSProperties } from 'react'
import type { Topic } from '../api/types'
import { Vinyl } from '../vinyl/Vinyl'
import { PALETTES } from './cover'

type CoverTopic = Pick<Topic, 'title' | 'palette' | 'cover' | 'level'>
type Props = { topic: CoverTopic; size?: 'grid' | 'hero'; showTitle?: boolean }

/** Capa do álbum (tema). Com foto: duotone nas cores da paleta. Sem foto: cor + formas. */
export function Cover({ topic, size = 'grid', showTitle = true }: Props) {
  const palette = PALETTES[topic.palette] ?? PALETTES.indigo
  const style = { '--cover-dark': palette.dark, '--cover-light': palette.light } as CSSProperties
  return (
    <div className={`cover cover-${size}${topic.cover ? ' has-photo' : ''}`} style={style}>
      {topic.cover && <img src={topic.cover} alt="" draggable={false} style={{ filter: `url(#duo-${topic.palette}) contrast(1.08)` }} />}
      {!topic.cover && (
        <span className="cover-art" aria-hidden="true">
          <i className="cover-sun" />
          <i className="cover-bar" />
          <i className="cover-bar short" />
        </span>
      )}
      {showTitle && <span className="cover-title">{topic.title}</span>}
    </div>
  )
}

/** Capa com o disco do tema aparecendo (o acabamento do disco mostra o nível). */
export function Sleeve({ topic, size = 'grid', showTitle = true, className = '' }: Props & { className?: string }) {
  return (
    <div className={`sleeve sleeve-${size} ${className}`}>
      <Vinyl palette={topic.palette} level={topic.level.name} className="sleeve-disc" />
      <Cover topic={topic} size={size} showTitle={showTitle} />
    </div>
  )
}
