import type { CSSProperties } from 'react'

type BoxProps = { w?: CSSProperties['width']; h?: CSSProperties['height']; r?: number; style?: CSSProperties }

/** Bloco cinza com brilho passando, no formato do que vai aparecer. */
export function Bone({ w = '100%', h = 16, r = 10, style }: BoxProps) {
  return <span className="skeleton" style={{ width: w, height: h, borderRadius: r, ...style }} />
}

function Loading({ children, label }: { children: React.ReactNode; label: string }) {
  return (
    <div className="skeleton-group" role="status" aria-live="polite">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  )
}

export function GallerySkeleton({ count = 5 }: { count?: number }) {
  return (
    <Loading label="Carregando seus temas">
      <div className="gallery">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="stack" style={{ gap: 'var(--space-2)' }}>
            <Bone h="auto" r={18} style={{ aspectRatio: '1' }} />
            <Bone w="70%" h={14} />
            <Bone w="45%" h={12} />
          </div>
        ))}
      </div>
    </Loading>
  )
}

export function CardSkeleton({ lines = 3, title = true }: { lines?: number; title?: boolean }) {
  return (
    <div className="card stack" style={{ gap: 'var(--space-4)' }}>
      {title && <Bone w="40%" h={20} />}
      {Array.from({ length: lines }, (_, i) => (
        <Bone key={i} w={`${92 - i * 14}%`} h={14} />
      ))}
    </div>
  )
}

export function PageSkeleton({ variant }: { variant: 'topic' | 'progress' | 'trail' | 'list' | 'quiz' }) {
  const narrow = variant === 'quiz' || variant === 'list'
  return (
    <main className={`shell${narrow ? ' narrow' : ''}`}>
      <Loading label="Carregando">
        <div className="stack" style={{ gap: 'var(--space-5)' }}>
          {variant === 'topic' && (
            <div className="topic-hero">
              <Bone h="auto" r={22} style={{ aspectRatio: '1', maxWidth: 360, alignSelf: 'center', justifySelf: 'center' }} />
              <div className="stack" style={{ gap: 'var(--space-4)' }}>
                <Bone w="60%" h={32} />
                <Bone w="80%" h={14} />
                <div className="row"><Bone w={72} h={72} r={999} /><Bone w={120} h={18} /></div>
              </div>
            </div>
          )}
          {variant === 'progress' && (
            <>
              <Bone w="35%" h={32} />
              <div className="stat-grid">
                {[0, 1, 2, 3].map((i) => <Bone key={i} h={84} r={20} />)}
              </div>
              <Bone h={180} r={20} />
            </>
          )}
          {variant === 'trail' && (
            <>
              <Bone w="25%" h={12} />
              <Bone w="55%" h={32} />
              <Bone h={10} r={999} />
              {[0, 1, 2, 3].map((i) => <Bone key={i} h={72} r={20} />)}
            </>
          )}
          {(variant === 'list' || variant === 'quiz') && (
            <>
              <Bone w="45%" h={32} />
              <CardSkeleton lines={variant === 'quiz' ? 4 : 6} />
            </>
          )}
          {(variant === 'topic' || variant === 'progress') && <CardSkeleton lines={4} />}
        </div>
      </Loading>
    </main>
  )
}
