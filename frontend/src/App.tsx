import { NavLink, Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { getToken } from './auth/auth'
import { LoginPage } from './auth/LoginPage'
import { Logo } from './brand/Logo'
import { HomePage } from './home/HomePage'
import { ProgressPage } from './progress/ProgressPage'
import { RankingPage } from './ranking/RankingPage'
import { MiniTimer } from './timer/MiniTimer'
import { TimerPage } from './timer/TimerPage'
import { NewTrailPage } from './trails/NewTrailPage'
import { QuizPage } from './trails/QuizPage'
import { TrailPage } from './trails/TrailPage'

const ICONS = {
  home: 'M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-4.5v-5h-5v5H5a1 1 0 0 1-1-1z',
  timer: 'M12 21a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm0-12v4l2.5 2.5M9.5 2.5h5',
  chart: 'M5 20V12M10 20V7M15 20v-5M20 20V4',
  trophy: 'M8 4h8v5a4 4 0 0 1-8 0zM8 6H5v1a3 3 0 0 0 3 3M16 6h3v1a3 3 0 0 1-3 3M12 13v4M9 20h6M10 17h4',
}

function Icon({ path }: { path: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={path} />
    </svg>
  )
}

/** Cada troca de tela remonta o conteúdo, e ele entra com uma animação curta. */
export function Page() {
  const { pathname } = useLocation()
  return (
    <div className="page" key={pathname}>
      <Outlet />
    </div>
  )
}

function Private() {
  if (!getToken()) return <Navigate to="/entrar" replace />
  return (
    <>
      <nav className="nav" aria-label="Principal">
        <div className="nav-brand"><Logo size={32} /></div>
        <div className="nav-links">
          <NavLink to="/" end><Icon path={ICONS.home} />Início</NavLink>
          <NavLink to="/estudar"><Icon path={ICONS.timer} />Estudar</NavLink>
          <NavLink to="/progresso"><Icon path={ICONS.chart} />Progresso</NavLink>
          <NavLink to="/ranking"><Icon path={ICONS.trophy} />Ranking</NavLink>
        </div>
      </nav>
      <div className="app-main">
        <Page />
      </div>
      <MiniTimer />
    </>
  )
}

export default function App() {
  return (
    <Routes>
      <Route element={<Page />}>
        <Route path="/entrar" element={<LoginPage />} />
      </Route>
      <Route element={<Private />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/estudar" element={<TimerPage />} />
        <Route path="/progresso" element={<ProgressPage />} />
        <Route path="/ranking" element={<RankingPage />} />
        <Route path="/aprender" element={<NewTrailPage />} />
        <Route path="/trilha/:id" element={<TrailPage />} />
        <Route path="/trilha/:id/parte/:partId/exercicios" element={<QuizPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
