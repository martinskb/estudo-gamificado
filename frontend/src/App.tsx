import { NavLink, Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { getToken } from './auth/auth'
import { LoginPage } from './auth/LoginPage'
import { HomePage } from './home/HomePage'
import { ProgressPage } from './progress/ProgressPage'
import { TimerPage } from './timer/TimerPage'

function Private() {
  if (!getToken()) return <Navigate to="/entrar" replace />
  return (
    <>
      <Outlet />
      <nav className="nav" aria-label="Principal">
        <NavLink to="/" end>Início</NavLink>
        <NavLink to="/estudar">Estudar</NavLink>
        <NavLink to="/progresso">Progresso</NavLink>
      </nav>
    </>
  )
}

function Placeholder({ title }: { title: string }) {
  return (
    <main className="shell">
      <h1>{title}</h1>
      <p className="muted">Em construção.</p>
    </main>
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
        <Route path="/aprender" element={<Placeholder title="Quero aprender…" />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
