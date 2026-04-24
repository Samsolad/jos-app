import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/authStore'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import Layout from './pages/app/Layout'
import Dashboard from './pages/app/Dashboard'
import Projects from './pages/app/Projects'
import Goals from './pages/app/Goals'
import Habits from './pages/app/Habits'
import Revenue from './pages/app/Revenue'

function Spinner() {
  return (
    <div className="h-screen bg-[#080808] flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-[#2a2a2a] border-t-white rounded-full animate-spin" />
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuthStore()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  return children
}

function AuthRoute({ children }) {
  const { user, loading } = useAuthStore()
  if (loading) return <Spinner />
  if (user) return <Navigate to="/" replace />
  return children
}

// Placeholder for pages not built yet
function ComingSoon({ name }) {
  return (
    <div className="animate-fadeUp">
      <p className="text-[10px] tracking-[0.2em] uppercase text-[#444] font-medium mb-2">{name}</p>
      <h1 className="font-serif text-[24px] font-bold mb-2">{name}</h1>
      <p className="text-[13px] text-[#888] font-light">Coming in the next batch.</p>
    </div>
  )
}

export default function App() {
  const init = useAuthStore(s => s.init)
  useEffect(() => { init() }, [init])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
        <Route path="/register" element={<AuthRoute><Register /></AuthRoute>} />

        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="projects" element={<Projects />} />
          <Route path="goals" element={<Goals />} />
          <Route path="habits" element={<Habits />} />
          <Route path="revenue" element={<Revenue />} />
          <Route path="social" element={<ComingSoon name="Social" />} />
          <Route path="family" element={<ComingSoon name="Family" />} />
          <Route path="chat" element={<ComingSoon name="AI Chat" />} />
          <Route path="profile" element={<ComingSoon name="Profile" />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}