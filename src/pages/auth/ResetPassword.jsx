import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { supabase } from '../../lib/supabase'
import useAuthStore from '../../store/authStore'
import { formatSupabaseAuthError } from '../../lib/supabaseKey'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function ResetPassword() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [ready, setReady] = useState(false)
  const updatePassword = useAuthStore((s) => s.updatePassword)
  const navigate = useNavigate()

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') setReady(true)
    })

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) setReady(true)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setLoading(true)
    try {
      await updatePassword(password)
      await supabase.auth.signOut()
      navigate('/login?reset=success')
    } catch (err) {
      setError(formatSupabaseAuthError(err))
    }
    setLoading(false)
  }

  if (!ready) {
    return (
      <div className="min-h-screen bg-jos-bg flex items-center justify-center p-8">
        <div className="w-full max-w-md text-center">
          <p className="text-jos-muted text-sm mb-4">
            Open the reset link from your email to set a new password.
          </p>
          <Link to="/login" className="text-sm text-jos-accent hover:underline">
            Back to sign in
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-jos-bg flex items-center justify-center p-8">
      <div className="w-full max-w-md animate-[fadeUp_0.4s_ease]">
        <h2 className="font-serif text-[28px] font-bold text-jos-text mb-1">
          Set a <em className="text-jos-muted">new password</em>
        </h2>
        <p className="text-[13px] text-jos-muted font-light mb-8">
          Choose a password you have not used before.
        </p>

        <form onSubmit={handleSubmit}>
          <Input
            label="New password"
            type="password"
            revealable
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
          />
          <Input
            label="Confirm password"
            type="password"
            revealable
            placeholder="••••••••"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
          />
          {error && <p className="text-jos-error text-xs mb-4 font-light">{error}</p>}
          <Button type="submit" size="full" disabled={loading}>
            {loading ? (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              'Update password'
            )}
          </Button>
        </form>

        <p className="text-xs text-jos-muted mt-5 text-center font-light">
          <Link to="/login" className="text-jos-text underline font-medium hover:text-jos-accent">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
