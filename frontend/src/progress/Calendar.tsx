import { useWide } from '../ui/useWide'
import { buildCalendar, todayBelem } from './calendarGrid'

const LABEL = { studied: 'estudou', saved: 'salvo pela proteção', empty: 'sem estudo', future: '' }

type Props = { studied: string[]; saved: string[]; weeks?: number }

export function Calendar({ studied, saved, weeks }: Props) {
  const wide = useWide()
  const grid = buildCalendar(todayBelem(), weeks ?? (wide ? 36 : 18), studied, saved)
  return (
    <div className="stack">
      <div className="calendar" role="img" aria-label={`${studied.length} dias estudados`}>
        {grid.map((week) => (
          <div className="calendar-week" key={week[0].date}>
            {week.map((cell) => (
              <span
                key={cell.date}
                className={`calendar-day ${cell.state}`}
                title={cell.state === 'future' ? undefined : `${cell.date.split('-').reverse().join('/')}: ${LABEL[cell.state]}`}
              />
            ))}
          </div>
        ))}
      </div>
      <div className="row small muted wrap">
        <span className="row" style={{ gap: 6 }}><span className="calendar-day studied" /> Estudou</span>
        <span className="row" style={{ gap: 6 }}><span className="calendar-day saved" /> Salvo pela proteção</span>
      </div>
    </div>
  )
}
