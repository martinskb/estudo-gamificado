import { type CSSProperties, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import type { TopicLight } from '../api/types'
import { playSound } from '../ui/sound'
import { LEVEL_ORDER, type LightFrame, lightFrames } from './lightAnimation'

const reduceMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches
const SPARKS = Array.from({ length: 14 }, (_, i) => {
  const angle = (i / 14) * Math.PI * 2
  const dist = 46 + (i % 3) * 14
  return { '--dx': `${Math.cos(angle) * dist}px`, '--dy': `${Math.sin(angle) * dist}px`, '--delay': `${(i % 4) * 40}ms` } as CSSProperties
})

/** "Luz do tema" na comemoração: a barra enche e, ao subir de nível, a luz cresce e solta faíscas. */
export function TopicLightCard({ light, delay = 900 }: { light: TopicLight; delay?: number }) {
  const frames = lightFrames(light)
  const [frame, setFrame] = useState<LightFrame>(frames[0])
  const [showMax, setShowMax] = useState(false)

  useEffect(() => {
    const all = lightFrames(light)
    if (reduceMotion()) {
      setFrame(all[all.length - 1])
      if (light.level_up) playSound(light.max_level ? 'max' : 'levelup')
      if (light.max_level) setShowMax(true)
      return
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
  return (
    <>
      <section className={`light-card${frame.burst ? ' burst' : ''}`} aria-label="Luz do tema" style={{ '--lvl': index } as CSSProperties}>
        <div className="light-orb-wrap" aria-hidden="true">
          <span className="light-orb" key={frame.level} />
          {frame.burst && SPARKS.map((style, i) => <i key={i} className="spark" style={style} />)}
        </div>
        <div className="stack grow" style={{ gap: 'var(--space-2)' }}>
          <span className="muted small truncate">Luz de {light.title}</span>
          <strong className="light-level" key={`n-${frame.level}`}>
            {light.level_up && frame.level === light.after.level ? `${frame.level}!` : frame.level}
          </strong>
          <div className="bar light-bar"><span style={{ width: `${Math.round(frame.progress * 100)}%` }} /></div>
          <span className="muted small">{next ? `Próximo: ${next}` : 'Nível máximo'}</span>
        </div>
      </section>
      {showMax && <FarolMoment title={light.title} topicId={light.id} onClose={() => setShowMax(false)} />}
    </>
  )
}

function FarolMoment({ title, topicId, onClose }: { title: string; topicId: number; onClose: () => void }) {
  return (
    <div className="farol" role="dialog" aria-modal="true" aria-label="Farol aceso">
      <div className="farol-rays" aria-hidden="true" />
      <div className="farol-content">
        <span className="farol-orb" aria-hidden="true" />
        {SPARKS.concat(SPARKS).map((style, i) => (
          <i key={i} className="spark big" style={{ ...style, '--delay': `${200 + i * 35}ms` } as CSSProperties} aria-hidden="true" />
        ))}
        <p className="farol-eyebrow">NÍVEL MÁXIMO</p>
        <h2>Farol aceso!</h2>
        <p>40 horas de luz em <strong>{title}</strong>.</p>
        <div className="stack" style={{ width: '100%', gap: 'var(--space-2)' }}>
          <Link className="btn highlight block" to={`/tema/${topicId}`}>Ver meu tema</Link>
          <button className="btn ghost block farol-close" onClick={onClose} autoFocus>Continuar</button>
        </div>
      </div>
    </div>
  )
}
