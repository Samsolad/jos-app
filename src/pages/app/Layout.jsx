import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import { useState, useEffect } from 'react'
import MentorBanner from '../../components/MentorBanner'
import useMentorEngine from '../../hooks/useMentorEngine'
import useAppFocus from '../../hooks/useAppFocus'

const NAV = [
  { to: '/',        icon: '⊞', label: 'Hub'    },
  { to: '/projects',icon: '⊡', label: 'Work'   },
  { to: '/goals',   icon: '◈', label: 'Goals'  },
  { to: '/habits',  icon: '⊕', label: 'Habits' },
  { to: '/social',  icon: '⊙', label: 'Social' },
  { to: '/revenue', icon: '⊘', label: 'Money'  },
  { to: '/family',  icon: '⊗', label: 'Family' },
  { to: '/chat',    icon: '⊛', label: 'AI'     },
  { to: '/investors', icon: '◎', label: 'Invest' },
]

const MOBILE_NAV = [
  { to: '/',        icon: '⊞', label: 'Hub'   },
  { to: '/projects',icon: '⊡', label: 'Work'  },
  { to: '/goals',   icon: '◈', label: 'Goals' },
  { to: '/chat',    icon: '⊛', label: 'AI'    },
  { to: '/more',    icon: '≡',  label: 'More'  },
]

const MORE_ITEMS = [
  { to: '/habits',  icon: '⊕', label: 'Habits'  },
  { to: '/social',  icon: '⊙', label: 'Social'  },
  { to: '/revenue', icon: '⊘', label: 'Money'   },
  { to: '/family',  icon: '⊗', label: 'Family'  },
  { to: '/profile', icon: '⊙', label: 'Profile' },
  { to: '/investors', icon: '◎', label: 'Invest' },
]

const SECTION_NAMES = {
  '/':         'Hub',
  '/projects': 'Projects',
  '/goals':    'Goals',
  '/habits':   'Habits',
  '/social':   'Social',
  '/revenue':  'Revenue',
  '/family':   'Family',
  '/chat':     'AI Assistant',
  '/profile':  'Profile',
}

export default function Layout() {
  const { profile, logout } = useAuthStore()
  const navigate  = useNavigate()
  const location  = useLocation()
  const [menuOpen, setMenuOpen] = useState(false)
  const [moreOpen, setMoreOpen] = useState(false)

  // Start mentor engine
  useMentorEngine()
  useAppFocus()

// Unlock iOS audio on first tap
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

  // Close menus on route change
  useEffect(() => {
    setMenuOpen(false)
    setMoreOpen(false)
  }, [location.pathname])

  // Close menus on outside click
  useEffect(() => {
    const handler = (e) => {
      if (!e.target.closest('#user-menu-area')) setMenuOpen(false)
      if (!e.target.closest('#more-menu-area'))  setMoreOpen(false)
    }
    document.addEventListener('click', handler)
    return () => document.removeEventListener('click', handler)
  }, [])

  const initials  = profile?.name
    ? profile.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'
  const firstName    = profile?.name?.split(' ')[0] || 'User'
  const sectionName  = SECTION_NAMES[location.pathname] || 'Hub'

  const handleLogout = async () => {
    await logout()
    navigate('/login')
  }

  const todayStr = new Date().toLocaleDateString('en-GB', {
    weekday: 'short', day: 'numeric', month: 'short',
  })

  return (
    <div className="h-screen flex flex-col bg-[#080808]">

      {/* ── HEADER ── */}
      <header className="flex items-center justify-between px-4 sm:px-6 border-b border-[#1f1f1f] bg-[#080808]/[0.97] backdrop-blur-xl flex-shrink-0 sticky top-0 z-50"
  style={{ 
    paddingTop: 'env(safe-area-inset-top)',
    height: 'calc(52px + env(safe-area-inset-top))'
  }}
>
        <div className="text-[14px] sm:text-[15px] font-extrabold tracking-tight">
          J·OS <span className="text-[#444] font-light mx-1">/</span>
          <span className="text-[#888] font-normal text-[12px] sm:text-[13px]">{sectionName}</span>
        </div>
        <div className="flex items-center gap-3 sm:gap-4">
          <span className="text-[9px] sm:text-[10px] tracking-[0.14em] uppercase text-[#444]">
            {todayStr}
          </span>
          <div className="relative" id="user-menu-area">
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen) }}
              className="flex items-center gap-2 py-1 px-2 rounded hover:bg-[#181818] transition-colors"
            >
              <div className="w-[26px] h-[26px] rounded-full bg-white flex items-center justify-center text-[10px] sm:text-[11px] font-bold text-[#080808]">
                {initials}
              </div>
              <span className="text-xs font-medium text-[#e8e8e8] hidden sm:block">
                {firstName}
              </span>
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-11 bg-[#111] border border-[#2a2a2a] rounded-md p-2 min-w-[160px] shadow-xl z-50 animate-fadeIn">
                <button
                  onClick={() => navigate('/profile')}
                  className="w-full text-left px-3 py-2 text-xs text-[#888] hover:text-white hover:bg-[#181818] rounded transition-colors"
                >
                  ⊙ My Profile
                </button>
                <div className="h-px bg-[#1f1f1f] my-1.5" />
                <button
                  onClick={handleLogout}
                  className="w-full text-left px-3 py-2 text-xs text-[#f87171] hover:bg-[#ef444412] rounded transition-colors"
                >
                  ↩ Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── BODY ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Desktop sidebar — hidden on mobile */}
        <nav className="hidden md:flex w-14 flex-shrink-0 border-r border-[#1f1f1f] flex-col items-center py-3 gap-0.5 bg-[#080808] overflow-y-auto">
          {NAV.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `w-11 h-11 flex flex-col items-center justify-center gap-0.5 rounded-md transition-all duration-150 ${
                  isActive
                    ? 'bg-[#111] border border-[#2a2a2a]'
                    : 'border border-transparent hover:bg-[#181818]'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span className="text-[13px] leading-none">{item.icon}</span>
                  <span className={`text-[7px] font-semibold tracking-[0.5px] uppercase ${isActive ? 'text-white' : 'text-[#444]'}`}>
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-7 pb-24 md:pb-10">
          <Outlet />
        </main>
      </div>

      {/* ── MOBILE BOTTOM NAV ── */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#080808]/[0.97] backdrop-blur-xl border-t border-[#1f1f1f] z-50">
        <div className="flex items-center justify-around h-[56px] px-1">
          {MOBILE_NAV.map(item => {
            if (item.to === '/more') {
              return (
                <div key="more" className="relative" id="more-menu-area">
                  <button
                    onClick={(e) => { e.stopPropagation(); setMoreOpen(!moreOpen) }}
                    className="flex flex-col items-center justify-center gap-0.5 w-12 h-12 rounded-md"
                  >
                    <span className="text-[15px] leading-none">≡</span>
                    <span className="text-[8px] font-semibold tracking-[0.5px] uppercase text-[#444]">More</span>
                  </button>
                  {moreOpen && (
                    <div className="absolute bottom-14 right-0 bg-[#111] border border-[#2a2a2a] rounded-md p-2 min-w-[160px] shadow-xl z-50 animate-fadeIn">
                      {MORE_ITEMS.map(mi => (
                        <button
                          key={mi.to}
                          onClick={() => { navigate(mi.to); setMoreOpen(false) }}
                          className="w-full text-left px-3 py-2.5 text-xs text-[#888] hover:text-white hover:bg-[#181818] rounded transition-colors flex items-center gap-3"
                        >
                          <span className="text-[13px]">{mi.icon}</span>
                          {mi.label}
                        </button>
                      ))}
                      <div className="h-px bg-[#1f1f1f] my-1.5" />
                      <button
                        onClick={handleLogout}
                        className="w-full text-left px-3 py-2.5 text-xs text-[#f87171] hover:bg-[#ef444412] rounded transition-colors"
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
                className={({ isActive }) =>
                  `flex flex-col items-center justify-center gap-0.5 w-12 h-12 rounded-md transition-all ${
                    isActive ? 'bg-[#111]' : ''
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <span className="text-[15px] leading-none">{item.icon}</span>
                    <span className={`text-[8px] font-semibold tracking-[0.5px] uppercase ${isActive ? 'text-white' : 'text-[#444]'}`}>
                      {item.label}
                    </span>
                  </>
                )}
              </NavLink>
            )
          })}
        </div>
        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>

      {/* ── MENTOR BANNER — sits above bottom nav on mobile ── */}
      <MentorBanner />

    </div>
  )
}