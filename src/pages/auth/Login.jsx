import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const login = useAuthStore(s => s.login)
  const navigate = useNavigate()

  // Check for redirect reason (e.g. signed out from another device)
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (params.get('reason') === 'other_device') {
      queueMicrotask(() =>
        setError('You were signed out because your account was opened on another device.'),
      )
    }
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    if (!email || !password) { setError('Please fill in all fields.'); return }
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err) {
      const msg = err?.message || ''
      if (msg.includes('Invalid login credentials')) {
        setError(
          'Wrong email or password. If you just registered, open the confirmation email from Supabase first, then try again.',
        )
      } else if (msg.includes('Email not confirmed')) {
        setError('Please confirm your email using the link we sent you, then sign in.')
      } else {
        setError(msg || 'Sign-in failed.')
      }
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#080808] flex">
      {/* Left panel */}
      <div className="hidden md:flex flex-col w-[340px] border-r border-[#1f1f1f] p-12">
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
          {/* Mobile brand */}
          <div className="md:hidden mb-10">
            <h1 className="text-xl font-extrabold text-white">J·OS</h1>
            <p className="text-[10px] tracking-[0.2em] uppercase text-[#444] mt-1">Personal Operating System</p>
          </div>

          <h2 className="font-serif text-[28px] font-bold text-white mb-1">
            Welcome <em className="text-[#e8e8e8]">back</em>.
          </h2>
          <p className="text-[13px] text-[#888] font-light mb-8">Sign in to your personal OS.</p>

          <form onSubmit={handleSubmit}>
            <Input
              label="Email"
              type="email"
              placeholder="your@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            {error && <p className="text-[#ef4444] text-xs mb-4 font-light">{error}</p>}
            <Button type="submit" size="full" disabled={loading}>
              {loading ? <span className="w-4 h-4 border-2 border-[#08080833] border-t-[#080808] rounded-full animate-spin" /> : 'Sign In'}
            </Button>
          </form>

          <p className="text-xs text-[#888] mt-5 text-center font-light">
            Don't have an account?{' '}
            <Link to="/register" className="text-white underline font-medium hover:text-[#e8e8e8]">Create one</Link>
          </p>
        </div>
      </div>
    </div>
  )
}