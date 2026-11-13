import { Link } from 'react-router-dom'
import type { TrailSummary } from '../api/types'

export function TrailList({ trails }: { trails: TrailSummary[] }) {
  return (
    <div className="stack">
      {trails.map((t) => (
        <Link className="card stack" to={`/trilha/${t.trail_id}`} key={t.trail_id}>
          <div className="row spread">
            <strong className="truncate">{t.title}</strong>
            <span className="muted small">{t.parts_done}/{t.parts_total}</span>
          </div>
          <div className="bar" aria-hidden>
            <span style={{ width: `${t.parts_total ? (t.parts_done / t.parts_total) * 100 : 0}%` }} />
          </div>
        </Link>
      ))}
    </div>
  )
}
