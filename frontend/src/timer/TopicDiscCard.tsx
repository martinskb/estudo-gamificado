import { type CSSProperties, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { TopicLight } from '../api/types'
import type { PaletteName } from '../topics/cover'
import { playSound } from '../ui/sound'
import { Vinyl } from '../vinyl/Vinyl'
import { LEVEL_ORDER, type LightFrame, lightFrames } from './lightAnimation'

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const SPARKS = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2
  const dist = 46 + (i % 3) * 14
  return { '--dx': `${Math.cos(angle) * dist}px`, '--dy': `${Math.sin(angle) * dist}px`, '--delay': `${(i % 4) * 40}ms` } as CSSProperties
})

type Props = { light: TopicLight; palette: PaletteName; delay?: number }

/** Disco do tema na comemoração: a barra enche e, ao subir de nível, o disco troca de acabamento com faíscas. */
export function TopicDiscCard({ light, palette, delay = 900 }: Props) {
  const frames = lightFrames(light)
  const [frame, setFrame] = useState<LightFrame>(frames[0])
  const [showMax, setShowMax] = useState(false)

  useEffect(() => {
    const all = lightFrames(light)
    if (reduceMotion()) {
      const last = all[all.length - 1]
      const id = setTimeout(() => {
        setFrame(last)
        if (light.level_up) playSound(light.max_level ? 'max' : 'levelup')
        if (light.max_level) setShowMax(true)
      }, 0)
      return () => clearTimeout(id)
    }
    const timers = all.slice(1).map((f) =>
      setTimeout(() => {
        setFrame(f)
        if (f.burst) playSound(light.max_level ? 'max' : 'levelup')
        if (f.burst && light.max_level) setShowMax(true)
      }, delay + f.at),
    )
    return () => timers.forEach(clearTimeout)
  }, [light, delay])

  const index = Math.max(0, LEVEL_ORDER.indexOf(frame.level))
  const next = LEVEL_ORDER[index + 1]
  const justUp = light.level_up && frame.level === light.after.level
  return (
    <>
      <section className={`disc-card${frame.burst ? ' burst' : ''}`} aria-label="Disco do tema">
        <div className="disc-card-art" aria-hidden="true">
          <Vinyl key={frame.level} palette={palette} level={frame.level} className="disc-card-disc" />
          {frame.burst && SPARKS.map((style, i) => <i key={i} className="spark" style={style} />)}
        </div>
        <div className="stack grow" style={{ gap: 'var(--space-2)', minWidth: 0 }}>
          <span className="muted small truncate">{light.title}</span>
          <strong className="disc-card-level" key={`n-${frame.level}`}>
            Disco {frame.level === 'Vinil' ? 'de vinil' : `de ${frame.level.toLowerCase()}`}{justUp ? '!' : ''}
          </strong>
          <div className="bar disc-bar"><span style={{ width: `${Math.round(frame.progress * 100)}%` }} /></div>
          <span className="muted small">{next ? `Próximo: ${next}` : 'Nível máximo'}</span>
        </div>
      </section>
      {showMax && <DiamondMoment title={light.title} topicId={light.id} palette={palette} onClose={() => setShowMax(false)} />}
    </>
  )
}

type MomentProps = { title: string; topicId: number; palette: PaletteName; onClose: () => void }

function DiamondMoment({ title, topicId, palette, onClose }: MomentProps) {
  return (
    <div className="diamond" role="dialog" aria-modal="true" aria-label="Disco de diamante">
      <div className="diamond-rays" aria-hidden="true" />
      <div className="diamond-content">
        <Vinyl palette={palette} level="Diamante" spinning className="diamond-disc" />
        {SPARKS.concat(SPARKS).map((style, i) => (
          <i key={i} className="spark big" style={{ ...style, '--delay': `${200 + i * 35}ms` } as CSSProperties} aria-hidden="true" />
        ))}
        <p className="diamond-eyebrow">NÍVEL MÁXIMO</p>
        <h2>Disco de diamante!</h2>
        <p>40 horas focadas em <strong>{title}</strong>.</p>
        <div className="stack" style={{ width: '100%', gap: 'var(--space-2)' }}>
          <Link className="btn primary block" to={`/tema/${topicId}`}>Ver meu disco</Link>
          <button className="btn ghost block diamond-close" onClick={onClose} autoFocus>Continuar</button>
        </div>
      </div>
    </div>
  )
}
