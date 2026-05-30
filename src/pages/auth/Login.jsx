import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import { supabaseConfigError } from '../../lib/supabase'
import { formatSupabaseAuthError } from '../../lib/supabaseKey'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [loading, setLoading] = useState(false)
  const [forgotOpen, setForgotOpen] = useState(false)
  const [resetSent, setResetSent] = useState(false)
  const [resetLoading, setResetLoading] = useState(false)
  const login = useAuthStore((s) => s.login)
  const requestPasswordReset = useAuthStore((s) => s.requestPasswordReset)
  const navigate = useNavigate()

  useEffect(() => {
    if (supabaseConfigError) {
      setError(supabaseConfigError)
      return
    }
    const params = new URLSearchParams(window.location.search)
    if (params.get('reason') === 'other_device') {
      queueMicrotask(() =>
        setError('You were signed out because your account was opened on another device.'),
      )
    }
    if (params.get('reset') === 'success') {
      queueMicrotask(() =>
        setSuccess('Password updated. Sign in with your new password.'),
      )
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!email || !password) {
      setError('Please fill in all fields.')
      return
    }
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      setError(formatSupabaseAuthError(err))
    }
    setLoading(false)
  }

  const handleForgotSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    if (!email.trim()) {
      setError('Enter your email address to receive a reset link.')
      return
    }
    setResetLoading(true)
    try {
      await requestPasswordReset(email)
      setResetSent(true)
      setSuccess('Check your email for a password reset link.')
    } catch (err) {
      setError(formatSupabaseAuthError(err))
    }
    setResetLoading(false)
  }

  return (
    <div className="min-h-screen bg-jos-bg flex">
      {/* Left panel */}
      <div className="hidden md:flex flex-col w-[340px] border-r border-jos-border p-12 bg-jos-surface/30">
        <div>
          <h1 className="text-xl font-extrabold tracking-tight text-white">J·OS</h1>
          <p className="text-[10px] tracking-[0.2em] uppercase text-[#444] mt-1">Personal Operating System</p>
        </div>
        <div className="mt-12 space-y-4">
          {[
            'AI assistant that knows your context',
            'Daily briefings, smart reminders, social drafting',
            'Fully personalised to you',
          ].map((t, i) => (
            <div key={i} className="flex items-start gap-3">
              <div className="w-px h-8 bg-[#2a2a2a] flex-shrink-0 mt-1" />
              <p className="text-xs text-[#888] font-light leading-relaxed">{t}</p>
            </div>
          ))}
        </div>
        <div className="mt-auto flex gap-2">
          <Link to="/login" className="flex-1 text-center py-2.5 text-[11px] font-semibold tracking-[0.1em] uppercase bg-white text-[#080808] rounded">Sign In</Link>
          <Link to="/register" className="flex-1 text-center py-2.5 text-[11px] font-semibold tracking-[0.1em] uppercase border border-[#2a2a2a] text-[#888] rounded hover:text-white hover:border-[#333] transition-colors">Register</Link>
        </div>
      </div>

      {/* Right panel */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md animate-[fadeUp_0.4s_ease]">
          <div className="md:hidden mb-10">
            <h1 className="text-xl font-extrabold text-white">J·OS</h1>
            <p className="text-[10px] tracking-[0.2em] uppercase text-[#444] mt-1">Personal Operating System</p>
          </div>

          <h2 className="font-serif text-[28px] font-bold text-white mb-1">
            Welcome <em className="text-[#e8e8e8]">back</em>.
          </h2>
          <p className="text-[13px] text-[#888] font-light mb-8">Sign in to your personal OS.</p>

          {forgotOpen ? (
            <form onSubmit={handleForgotSubmit}>
              <p className="text-[13px] text-jos-muted font-light mb-6">
                Enter your email and we will send you a link to reset your password.
              </p>
              <Input
                label="Email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
              {error && <p className="text-jos-error text-xs mb-4 font-light">{error}</p>}
              {success && <p className="text-jos-success text-xs mb-4 font-light">{success}</p>}
              <Button type="submit" size="full" disabled={resetLoading || resetSent}>
                {resetLoading ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : resetSent ? (
                  'Link sent'
                ) : (
                  'Send reset link'
                )}
              </Button>
              <button
                type="button"
                onClick={() => {
                  setForgotOpen(false)
                  setResetSent(false)
                  setError('')
                  setSuccess('')
                }}
                className="w-full mt-4 text-xs text-jos-muted hover:text-jos-text text-center"
              >
                ← Back to sign in
              </button>
            </form>
          ) : (
            <form onSubmit={handleSubmit}>
              <Input
                label="Email"
                type="email"
                placeholder="your@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
              <div>
                <Input
                  label="Password"
                  type="password"
                  revealable
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                />
                <div className="flex justify-end -mt-3 mb-4">
                  <button
                    type="button"
                    onClick={() => {
                      setForgotOpen(true)
                      setError('')
                      setSuccess('')
                      setResetSent(false)
                    }}
                    className="text-[11px] text-jos-muted hover:text-jos-accent transition-colors"
                  >
                    Forgot password?
                  </button>
                </div>
              </div>
              {error && <p className="text-jos-error text-xs mb-4 font-light">{error}</p>}
              {success && <p className="text-jos-success text-xs mb-4 font-light">{success}</p>}
              <Button type="submit" size="full" disabled={loading}>
                {loading ? (
                  <span className="w-4 h-4 border-2 border-[#08080833] border-t-[#080808] rounded-full animate-spin" />
                ) : (
                  'Sign In'
                )}
              </Button>
            </form>
          )}

          {!forgotOpen && (
            <p className="text-xs text-[#888] mt-5 text-center font-light">
              Don&apos;t have an account?{' '}
              <Link to="/register" className="text-white underline font-medium hover:text-[#e8e8e8]">
                Create one
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  )
}
