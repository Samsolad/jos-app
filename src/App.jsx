import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/authStore'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ResetPassword from './pages/auth/ResetPassword'
import Marketing from './pages/Marketing'
import Layout from './pages/app/Layout'
import Plan from './pages/app/Plan'

function Spinner() {
  return (
    <div className="h-screen bg-jos-bg flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-jos-border border-t-jos-accent rounded-full animate-spin" />
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { user, loading } = useAuthStore()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/welcome" replace />
  return children
}

function AuthRoute({ children }) {
  const { user, loading } = useAuthStore()
  if (loading) return <Spinner />
  if (user) return <Navigate to="/" replace />
  return children
}

export default function App() {
  const init = useAuthStore((s) => s.init)
  const checkSessionLock = useAuthStore((s) => s.checkSessionLock)

  useEffect(() => { init() }, [init])

  useEffect(() => {
    const id = setInterval(() => { checkSessionLock() }, 60_000)
    return () => clearInterval(id)
  }, [checkSessionLock])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/welcome" element={<Marketing />} />
        <Route path="/login" element={<AuthRoute><Login /></AuthRoute>} />
        <Route path="/register" element={<AuthRoute><Register /></AuthRoute>} />
        <Route path="/reset-password" element={<ResetPassword />} />

        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Plan />} />
        </Route>

        <Route path="*" element={<Navigate to="/welcome" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
