import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import { useState, useEffect, startTransition } from 'react'
import MentorBanner from '../../components/MentorBanner'
import useMentorEngine from '../../hooks/useMentorEngine'
import useAppFocus from '../../hooks/useAppFocus'
import ThemeToggle from '../../components/ui/ThemeToggle'

const NAV = [
  { to: '/', icon: '⊞', label: 'Hub' },
  { to: '/projects', icon: '⊡', label: 'Work' },
  { to: '/goals', icon: '◈', label: 'Goals' },
  { to: '/habits', icon: '⊕', label: 'Habits' },
  { to: '/social', icon: '⊙', label: 'Social' },
  { to: '/revenue', icon: '⊘', label: 'Money' },
  { to: '/family', icon: '⊗', label: 'Family' },
  { to: '/chat', icon: '⊛', label: 'AI' },
  { to: '/investors', icon: '◎', label: 'Invest' },
]

const MOBILE_NAV = [
  { to: '/', icon: '⊞', label: 'Hub' },
  { to: '/projects', icon: '⊡', label: 'Work' },
  { to: '/goals', icon: '◈', label: 'Goals' },
  { to: '/chat', icon: '⊛', label: 'AI' },
  { to: '/more', icon: '≡', label: 'More' },
]

const MORE_ITEMS = [
  { to: '/habits', icon: '⊕', label: 'Habits' },
  { to: '/social', icon: '⊙', label: 'Social' },
  { to: '/revenue', icon: '⊘', label: 'Money' },
  { to: '/family', icon: '⊗', label: 'Family' },
  { to: '/profile', icon: '⊙', label: 'Profile' },
  { to: '/investors', icon: '◎', label: 'Invest' },
]

const SECTION_NAMES = {
  '/': 'Command Hub',
  '/projects': 'Projects',
  '/goals': 'Goals',
  '/habits': 'Habits',
  '/social': 'Social',
  '/revenue': 'Revenue',
  '/family': 'Family',
  '/chat': 'AI Assistant',
  '/profile': 'Profile',
}

export default function Layout() {
  const { profile, logout } = useAuthStore()
  const navigate = useNavigate()
  const location = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)
  const isChat = location.pathname === '/chat'

  useMentorEngine()
  useAppFocus()

  useEffect(() => {
    const unlock = () => {
      if (window.speechSynthesis) {
        const u = new SpeechSynthesisUtterance('')
        u.volume = 0
        window.speechSynthesis.speak(u)
      }
    }
    document.addEventListener('touchstart', unlock, { once: true })
    document.addEventListener('click', unlock, { once: true })
    return () => {
      document.removeEventListener('touchstart', unlock)
      document.removeEventListener('click', unlock)
    }
  }, [])

  useEffect(() => {
    startTransition(() => {
      setMenuOpen(false)
      setMoreOpen(false)
    })
  }, [location.pathname])

  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('#user-menu-area')) setMenuOpen(false)
      if (!e.target.closest('#more-menu-area')) setMoreOpen(false)
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const initials = profile?.name
    ? profile.name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .slice(0, 2)
        .toUpperCase()
    : '?'
  const firstName = profile?.name?.split(' ')[0] || 'User'
  const sectionName = SECTION_NAMES[location.pathname] || 'Hub'

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const todayStr = new Date().toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  })

  return (
    <div className="h-screen flex flex-col bg-jos-bg text-jos-text">

      {!isChat && (
        <header
          className="app-header flex items-center justify-between px-3 sm:px-6 border-b border-jos-border bg-jos-bg/95 backdrop-blur-xl flex-shrink-0 sticky top-0 z-50"
          style={{
            paddingTop: 'env(safe-area-inset-top)',
            height: 'calc(52px + env(safe-area-inset-top))',
          }}
        >
          <div className="min-w-0 flex-1 mr-2">
            <p className="text-[14px] sm:text-[15px] font-bold tracking-tight font-display truncate">
              <span className="text-jos-text">J·OS</span>
              <span className="text-jos-muted font-normal mx-1 hidden min-[400px]:inline">/</span>
              <span className="text-jos-muted font-medium text-[12px] sm:text-[13px]">{sectionName}</span>
            </p>
          </div>
          <div className="flex items-center gap-1.5 sm:gap-3 flex-shrink-0">
            <span className="text-[9px] sm:text-[10px] tracking-[0.14em] uppercase text-jos-muted hidden sm:inline">
              {todayStr}
            </span>
            <ThemeToggle />
            <div className="relative" id="user-menu-area">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setMenuOpen(!menuOpen)
                }}
                className="flex items-center gap-2 py-1 px-2 rounded-lg hover:bg-jos-surface-2 transition-colors"
                aria-expanded={menuOpen}
                aria-haspopup="menu"
              >
                <div className="w-[26px] h-[26px] rounded-full bg-jos-gradient flex items-center justify-center text-[10px] sm:text-[11px] font-bold text-white">
                  {initials}
                </div>
                <span className="text-xs font-medium text-jos-text hidden sm:block">{firstName}</span>
              </button>
              {menuOpen && (
                <div
                  className="absolute right-0 top-11 jos-card p-2 min-w-[160px] shadow-xl z-50 animate-fadeIn"
                  role="menu"
                >
                  <button
                    type="button"
                    onClick={() => navigate('/profile')}
                    className="w-full text-left px-3 py-2 text-xs text-jos-muted hover:text-jos-text hover:bg-jos-surface-2 rounded transition-colors"
                  >
                    ⊙ My Profile
                  </button>
                  <div className="h-px bg-jos-border my-1.5" />
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full text-left px-3 py-2 text-xs text-jos-error hover:bg-jos-error/10 rounded transition-colors"
                  >
                    ↩ Sign Out
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>
      )}

      <div className="flex flex-1 overflow-hidden">
        <nav
          className={`hidden md:flex w-[52px] xl:w-[76px] flex-shrink-0 border-r border-jos-border flex-col items-center py-3 gap-1 bg-jos-bg overflow-y-auto ${
            isChat ? 'border-jos-border/50' : ''
          }`}
          aria-label="Main navigation"
        >
          {NAV.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              title={item.label}
              aria-label={item.label}
              className={({ isActive }) =>
                `w-11 xl:w-[68px] min-h-[44px] flex flex-col items-center justify-center gap-1 rounded-lg transition-all duration-150 px-1 ${
                  isActive
                    ? 'bg-jos-surface border border-jos-accent/40 shadow-glow-cyan'
                    : 'border border-transparent hover:bg-jos-surface-2'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`text-[16px] xl:text-[15px] leading-none ${
                      item.to === '/chat' && isActive ? 'text-jos-accent' : ''
                    }`}
                  >
                    {item.icon}
                  </span>
                  <span
                    className={`hidden xl:block text-[9px] font-medium leading-tight text-center w-full truncate ${
                      isActive ? 'text-jos-text' : 'text-jos-muted'
                    }`}
                  >
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        <main
          className={`flex-1 overflow-y-auto ${
            isChat
              ? 'p-0 overflow-hidden'
              : 'p-4 sm:p-7 pb-[calc(4.5rem+env(safe-area-inset-bottom))] md:pb-10'
          }`}
        >
          <Outlet />
        </main>
      </div>

      {!isChat && (
        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-jos-bg/95 backdrop-blur-xl border-t border-jos-border z-50">
          <nav className="grid grid-cols-5 items-stretch min-h-[52px] px-0.5" aria-label="Mobile navigation">
            {MOBILE_NAV.map((item) => {
              if (item.to === '/more') {
                return (
                  <div key="more" className="relative flex" id="more-menu-area">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        setMoreOpen(!moreOpen)
                      }}
                      className={`flex flex-1 flex-col items-center justify-center min-h-[48px] rounded-lg transition-colors ${
                        moreOpen ? 'bg-jos-surface text-jos-text' : 'text-jos-muted'
                      }`}
                      aria-expanded={moreOpen}
                      aria-label="More menu"
                    >
                      <span className="text-[20px] leading-none" aria-hidden>≡</span>
                    </button>
                    {moreOpen && (
                      <div className="absolute bottom-[calc(100%+8px)] right-1 jos-card p-2 min-w-[168px] max-w-[min(100vw-16px,220px)] shadow-xl z-50 animate-fadeIn">
                        {MORE_ITEMS.map((mi) => (
                          <button
                            key={mi.to}
                            type="button"
                            onClick={() => {
                              navigate(mi.to)
                              setMoreOpen(false)
                            }}
                            className="w-full text-left px-3 py-2.5 text-xs text-jos-muted hover:text-jos-text hover:bg-jos-surface-2 rounded transition-colors flex items-center gap-3"
                          >
                            <span className="text-[13px]">{mi.icon}</span>
                            {mi.label}
                          </button>
                        ))}
                        <div className="h-px bg-jos-border my-1.5" />
                        <button
                          type="button"
                          onClick={handleLogout}
                          className="w-full text-left px-3 py-2.5 text-xs text-jos-error hover:bg-jos-error/10 rounded transition-colors"
                        >
                          ↩ Sign Out
                        </button>
                      </div>
                    )}
                  </div>
                )
              }
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.to === '/'}
                  aria-label={item.label}
                  title={item.label}
                  className={({ isActive }) =>
                    `flex flex-col items-center justify-center min-h-[48px] rounded-lg transition-colors ${
                      isActive
                        ? 'bg-jos-surface text-jos-text'
                        : 'text-jos-muted hover:text-jos-text'
                    }`
                  }
                >
                  {({ isActive }) => (
                    <span
                      className={`text-[20px] leading-none ${
                        item.to === '/chat' && isActive ? 'text-jos-accent' : ''
                      }`}
                      aria-hidden
                    >
                      {item.icon}
                    </span>
                  )}
                </NavLink>
              )
            })}
          </nav>
          <div className="h-[env(safe-area-inset-bottom)]" />
        </div>
      )}

      {!isChat && <MentorBanner />}
    </div>
  )
}
