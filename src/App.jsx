import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/authStore'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import Layout from './pages/app/Layout'
import Dashboard from './pages/app/Dashboard'
import Projects from './pages/app/Projects'

function ProtectedRoute({ children }) {
  const { user, loading } = useAuthStore()
  if (loading) return (
    <div className="h-screen bg-[#080808] flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-[#2a2a2a] border-t-white rounded-full animate-spin" />
    </div>
  )
  if (!user) return <Navigate to="/login" />
  return children
}

function AuthRoute({ children }) {
  const { user, loading } = useAuthStore()
  if (loading) return null
  if (user) return <Navigate to="/" />
  return children
}

export default function App() {
  const init = useAuthStore(s => s.init)

  useEffect(() => { init() }, [init])

  return (
    <BrowserRouter>
      <Routes>
        {/* Auth routes */}
        <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
        <Route path="/register" element={<AuthRoute><Register /></AuthRoute>} />

        {/* App routes */}
        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="projects" element={<Projects />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}