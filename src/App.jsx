import { useEffect } from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import useAuthStore from './store/authStore'
import { isOnboardingComplete } from './lib/dashboardPrefs'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import ResetPassword from './pages/auth/ResetPassword'
import Marketing from './pages/Marketing'
import OnboardingWizard from './pages/onboarding/OnboardingWizard'
import Layout from './pages/app/Layout'
import Dashboard from './pages/app/Dashboard'
import Projects from './pages/app/Projects'
import Goals from './pages/app/Goals'
import Habits from './pages/app/Habits'
import Revenue from './pages/app/Revenue'
import Social from './pages/app/Social'
import Family from './pages/app/Family'
import Chat from './pages/app/Chat'
import Profile from './pages/app/Profile'
import Investors from './pages/app/Investors'

function Spinner() {
  return (
    <div className="h-screen bg-[#080808] flex items-center justify-center">
      <div className="w-5 h-5 border-2 border-[#2a2a2a] border-t-white rounded-full animate-spin" />
    </div>
  )
}

function ProtectedRoute({ children }) {
  const { user, profile, loading } = useAuthStore()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/welcome" replace />
  if (!isOnboardingComplete(profile)) return <Navigate to="/onboarding" replace />
  return children
}

function OnboardingRoute({ children }) {
  const { user, profile, loading } = useAuthStore()
  if (loading) return <Spinner />
  if (!user) return <Navigate to="/login" replace />
  if (isOnboardingComplete(profile)) return <Navigate to="/" replace />
  return children
}

function AuthRoute({ children }) {
  const { user, profile, loading } = useAuthStore()
  if (loading) return <Spinner />
  if (user) {
    return <Navigate to={isOnboardingComplete(profile) ? '/' : '/onboarding'} replace />
  }
  return children
}

export default function App() {
  const init = useAuthStore(s => s.init)
  const checkSessionLock = useAuthStore(s => s.checkSessionLock)

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
        <Route path="/onboarding" element={<OnboardingRoute><OnboardingWizard /></OnboardingRoute>} />

        <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
          <Route index element={<Dashboard />} />
          <Route path="projects" element={<Projects />} />
          <Route path="goals" element={<Goals />} />
          <Route path="habits" element={<Habits />} />
          <Route path="revenue" element={<Revenue />} />
          <Route path="social" element={<Social />} />
          <Route path="family" element={<Family />} />
          <Route path="chat" element={<Chat />} />
          <Route path="profile" element={<Profile />} />
          <Route path="investors" element={<Investors />} />
        </Route>

        <Route path="*" element={<Navigate to="/welcome" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
