import { Outlet, useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import { useState } from 'react'
import ThemeToggle from '../../components/ui/ThemeToggle'

export default function Layout() {
  const { profile, logout } = useAuthStore()
  const navigate = useNavigate()
  const [menuOpen, setMenuOpen] = useState(false)

  const initials = profile?.name
    ? profile.name.split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  return (
    <div className="min-h-screen flex flex-col bg-jos-bg text-jos-text">
      <header
        className="app-header flex items-center justify-between px-4 sm:px-6 border-b border-jos-border bg-jos-bg/95 backdrop-blur-xl flex-shrink-0 sticky top-0 z-50"
        style={{
          paddingTop: 'env(safe-area-inset-top)',
          height: 'calc(52px + env(safe-area-inset-top))',
        }}
      >
        <div>
          <p className="text-[15px] font-bold tracking-tight font-display">J·OS</p>
          <p className="text-[9px] tracking-[0.16em] uppercase text-jos-muted hidden sm:block">
            Idea → Product → Market
          </p>
        </div>
        <div className="flex items-center gap-2">
          <ThemeToggle />
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen(!menuOpen)}
              className="w-8 h-8 rounded-full bg-jos-gradient flex items-center justify-center text-[10px] font-bold text-white"
              aria-label="Account menu"
            >
              {initials}
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} aria-hidden />
                <div className="absolute right-0 top-10 jos-card p-2 min-w-[140px] shadow-xl z-50">
                  <p className="px-3 py-2 text-[11px] text-jos-muted truncate">{profile?.name || 'Account'}</p>
                  <div className="h-px bg-jos-border my-1" />
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 text-xs text-jos-error hover:bg-jos-error/10 rounded"
                  >
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 overflow-y-auto p-4 sm:p-8 pb-[calc(1.5rem+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>
    </div>
  )
}
