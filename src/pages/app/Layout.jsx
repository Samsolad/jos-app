import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import { useState, useEffect, useRef } from 'react'
import MentorBanner from '../../components/MentorBanner'
import useMentorEngine from '../../hooks/useMentorEngine'


const NAV = [
  { to: '/', icon: '⊞', label: 'Hub' },
  { to: '/projects', icon: '⊡', label: 'Work' },
  { to: '/goals', icon: '◈', label: 'Goals' },
  { to: '/habits', icon: '⊕', label: 'Habits' },
  { to: '/social', icon: '⊙', label: 'Social' },
  { to: '/revenue', icon: '⊘', label: 'Money' },
  { to: '/family', icon: '⊗', label: 'Family' },
  { to: '/chat', icon: '⊛', label: 'AI' },
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
]


const SECTION_NAMES = {
  '/': 'Hub',
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


  const userMenuRef = useRef(null)
  const moreMenuRef = useRef(null)


  useMentorEngine()


  useEffect(() => {
    setMenuOpen(false)
    setMoreOpen(false)
  }, [location.pathname])


  useEffect(() => {
    const handleClickOutside = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setMenuOpen(false)
      }
      if (moreMenuRef.current && !moreMenuRef.current.contains(e.target)) {
        setMoreOpen(false)
      }
    }


    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [])


  const initials = profile?.name
    ? profile.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
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
    <div className="h-screen flex flex-col bg-[#080808]">


      {/* Header */}
      <header className="flex items-center justify-between px-4 h-[52px] border-b border-[#1f1f1f] bg-[#080808]/[0.97] backdrop-blur-xl sticky top-0 z-50">
        <div className="text-[15px] font-extrabold">
          J·OS <span className="text-[#444] mx-1">/</span>
          <span className="text-[#888] text-[13px]">{sectionName}</span>
        </div>


        <div className="flex items-center gap-4">
          <span className="text-[10px] uppercase text-[#444]">{todayStr}</span>


          <div ref={userMenuRef} className="relative">
            <button
              onClick={(e) => {
                e.stopPropagation()
                setMenuOpen(prev => !prev)
              }}
              className="flex items-center gap-2 px-2 py-1 rounded hover:bg-[#181818]"
            >
              <div className="w-[26px] h-[26px] rounded-full bg-white flex items-center justify-center text-[11px] font-bold text-black">
                {initials}
              </div>
              <span className="text-xs hidden sm:block">{firstName}</span>
            </button>


            {menuOpen && (
              <div className="absolute right-0 top-11 bg-[#111] border border-[#2a2a2a] rounded-md p-2 min-w-[160px] z-[60]">
                <button onClick={() => navigate('/profile')} className="menu-item">
                  ⊙ My Profile
                </button>
                <div className="divider" />
                <button onClick={handleLogout} className="menu-item text-red-400">
                  ↩ Sign Out
                </button>
              </div>
            )}
          </div>
        </div>
      </header>


      {/* Mentor Banner */}
      <MentorBanner />


      {/* Body */}
      <div className="flex flex-1 overflow-hidden">


        {/* Sidebar */}
        <nav className="hidden md:flex w-14 border-r border-[#1f1f1f] flex-col items-center py-3">
          {NAV.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}>
              {({ isActive }) => (
                <div className={`nav-item ${isActive ? 'active' : ''}`}>
                  <span>{item.icon}</span>
                  <span className="text-[7px]">{item.label}</span>
                </div>
              )}
            </NavLink>
          ))}
        </nav>


        {/* Main */}
        <main className="flex-1 overflow-y-auto p-4 pb-24 md:pb-10">
          <Outlet />
        </main>
      </div>


      {/* Mobile Nav */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 bg-[#080808] border-t border-[#1f1f1f] z-50">
        <div className="flex justify-around h-[56px]">


          {MOBILE_NAV.map(item => {
            if (item.to === '/more') {
              return (
                <div key="more" ref={moreMenuRef} className="relative">
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      setMoreOpen(prev => !prev)
                    }}
                    className="nav-btn"
                  >
                    ≡
                    <span>More</span>
                  </button>


                  {moreOpen && (
                    <div className="absolute bottom-14 right-2 bg-[#111] border border-[#2a2a2a] rounded-md p-2 min-w-[160px] z-[60]">
                      {MORE_ITEMS.map(mi => (
                        <button
                          key={mi.to}
                          onClick={() => {
                            navigate(mi.to)
                            setMoreOpen(false)
                          }}
                          className="menu-item"
                        >
                          {mi.icon} {mi.label}
                        </button>
                      ))}
                      <div className="divider" />
                      <button onClick={handleLogout} className="menu-item text-red-400">
                        ↩ Sign Out
                      </button>
                    </div>
                  )}
                </div>
              )
            }


            return (
              <NavLink key={item.to} to={item.to} end={item.to === '/'}>
                {({ isActive }) => (
                  <div className={`nav-btn ${isActive ? 'active' : ''}`}>
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                )}
              </NavLink>
            )
          })}


        </div>


        <div className="h-[env(safe-area-inset-bottom)]" />
      </div>
    </div>
  )
}