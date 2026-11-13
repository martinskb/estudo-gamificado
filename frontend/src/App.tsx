import { NavLink, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { getToken } from './auth/auth'
import { LoginPage } from './auth/LoginPage'
import { HomePage } from './home/HomePage'
import { ProgressPage } from './progress/ProgressPage'
import { MiniTimer } from './timer/MiniTimer'
import { TimerPage } from './timer/TimerPage'
import { NewTrailPage } from './trails/NewTrailPage'
import { QuizPage } from './trails/QuizPage'
import { TrailPage } from './trails/TrailPage'

function Private() {
  if (!getToken()) return <Navigate to="/entrar" replace />
  return (
    <>
      <Outlet />
      <MiniTimer />
      <nav className="nav" aria-label="Principal">
        <NavLink to="/" end>Início</NavLink>
        <NavLink to="/estudar">Estudar</NavLink>
        <NavLink to="/progresso">Progresso</NavLink>
      </nav>
    </>
  )
}

export default function App() {
  return (
    <Routes>
      <Route path="/entrar" element={<LoginPage />} />
      <Route element={<Private />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/estudar" element={<TimerPage />} />
        <Route path="/progresso" element={<ProgressPage />} />
        <Route path="/aprender" element={<NewTrailPage />} />
        <Route path="/trilha/:id" element={<TrailPage />} />
        <Route path="/trilha/:id/parte/:partId/exercicios" element={<QuizPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
