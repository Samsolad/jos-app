import { useNavigate } from 'react-router-dom'
import useFocusStore from '../store/focusStore'
import useAuthStore from '../store/authStore'
import useProjectStore from '../store/projectStore'
import useGoalStore from '../store/goalStore'
import useHabitStore from '../store/habitStore'
import useRevenueStore from '../store/revenueStore'
import useTaskStore from '../store/taskStore'

const URGENCY = {
  critical: { color: '#ef4444', bg: 'rgba(239,68,68,0.08)',   border: 'rgba(239,68,68,0.2)',   dot: 'bg-[#ef4444] animate-pulse', label: 'Critical' },
  high:     { color: '#f59e0b', bg: 'rgba(245,158,11,0.08)',  border: 'rgba(245,158,11,0.2)',  dot: 'bg-[#f59e0b]',               label: 'High'     },
  medium:   { color: '#e8e8e8', bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.1)', dot: 'bg-[#888]',                   label: 'Medium'   },
  low:      { color: '#888888', bg: 'rgba(255,255,255,0.02)', border: 'rgba(255,255,255,0.06)',dot: 'bg-[#444]',                   label: 'Low'      },
}

const TYPE_ICONS = {
  task: '⊡', goal: '◈', habit: '⊕', revenue: '⊘', social: '⊙',
}

export default function DailyFocus() {
  const navigate = useNavigate()

  // All store values read at component level — safe for hooks rules
  const { focus, loading, error, refresh } = useFocusStore()
  const profile    = useAuthStore(s => s.profile)
  const { projects } = useProjectStore()
  const { goals }    = useGoalStore()
  const { habits }   = useHabitStore()
  const { entries }  = useRevenueStore()
  const { tasks }    = useTaskStore()

  const handleRefresh = () => {
    refresh(profile, projects, goals, habits, entries, tasks)
  }

  // ── LOADING ──────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] tracking-[0.2em] uppercase text-[#444] font-medium">
            Today's Focus
          </p>
        </div>
        <div className="bg-[#111] border border-[#1f1f1f] rounded-md p-5">
          <div className="flex items-center gap-3 mb-4">
            <div className="flex gap-1.5">
              {[0, 0.15, 0.3].map((d, i) => (
                <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#444] animate-bounce"
                  style={{ animationDelay: `${d}s` }} />
              ))}
            </div>
            <p className="text-[13px] text-[#444] font-light">J·OS is analysing your day…</p>
          </div>
          <div className="space-y-2">
            {[1,2,3].map(i => (
              <div key={i} className="h-[60px] bg-[#181818] rounded-md animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ── ERROR / EMPTY ─────────────────────────────────────────────
  if (error || !focus) {
    return (
      <div className="mb-6">
        <div className="flex items-center justify-between mb-3">
          <p className="text-[10px] tracking-[0.2em] uppercase text-[#444] font-medium">
            Today's Focus
          </p>
          <button onClick={handleRefresh}
            className="text-[10px] text-[#444] hover:text-[#888] transition-colors">
            ↻ Retry
          </button>
        </div>
        <div className="bg-[#111] border border-[#1f1f1f] rounded-md p-4">
          <p className="text-[13px] text-[#444] font-light">
            Add projects and tasks so J·OS can set your daily focus.
          </p>
        </div>
      </div>
    )
  }

  const items = focus.focus || []

  // ── RENDER ───────────────────────────────────────────────────
  return (
    <div className="mb-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] tracking-[0.2em] uppercase text-[#444] font-medium">
          Today's Focus
        </p>
        <button onClick={handleRefresh}
          className="text-[10px] text-[#444] hover:text-[#888] transition-colors">
          ↻ Refresh
        </button>
      </div>

      {/* Greeting + summary */}
      {(focus.greeting || focus.summary) && (
        <div className="mb-4">
          {focus.greeting && (
            <p className="font-serif text-[17px] sm:text-[18px] font-bold mb-1 leading-snug">
              {focus.greeting}
            </p>
          )}
          {focus.summary && (
            <p className="text-[13px] text-[#888] font-light leading-relaxed">
              {focus.summary}
            </p>
          )}
        </div>
      )}

      {/* Focus items */}
      <div className="space-y-2 mb-3">
        {items.map((item, i) => {
          const u = URGENCY[item.urgency] || URGENCY.medium
          const isTop = i === 0
          return (
            <button
              key={i}
              onClick={() => item.action && navigate(`/${item.action}`)}
              className="w-full text-left rounded-md border overflow-hidden transition-all hover:opacity-90 active:scale-[0.99]"
              style={{ background: u.bg, borderColor: u.border }}
            >
              {isTop && <div className="h-[2px]" style={{ background: u.color }} />}
              <div className="p-3 sm:p-4 flex items-start gap-3">
                <div
                  className="w-[22px] h-[22px] rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0 mt-0.5"
                  style={{
                    background: isTop ? u.color : 'rgba(255,255,255,0.06)',
                    color:      isTop ? '#080808' : u.color,
                  }}
                >
                  {i + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <p className="text-[13px] sm:text-[14px] font-semibold leading-snug">
                      {item.title}
                    </p>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <span className={`w-1.5 h-1.5 rounded-full ${u.dot}`} />
                      <span className="text-[9px] font-bold tracking-[0.1em] uppercase"
                        style={{ color: u.color }}>
                        {u.label}
                      </span>
                    </div>
                  </div>
                  <p className="text-[12px] text-[#888] font-light leading-relaxed mb-2">
                    {item.detail}
                  </p>
                  <div className="flex items-center gap-2 flex-wrap">
                    {item.project && (
                      <span className="text-[10px] text-[#444]">
                        {TYPE_ICONS[item.type] || '⊡'} {item.project}
                      </span>
                    )}
                    {!item.project && item.type && (
                      <span className="text-[10px] text-[#444]">
                        {TYPE_ICONS[item.type] || '⊡'} {item.type}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </button>
          )
        })}
      </div>

      {/* Watchout */}
      {focus.watchout && (
        <div className="px-4 py-3 bg-[#f59e0b]/[0.05] border border-[#f59e0b]/[0.15] rounded-md mb-2">
          <p className="text-[11px] text-[#fbbf24] font-light leading-relaxed">
            ⚠ {focus.watchout}
          </p>
        </div>
      )}

      {/* Momentum */}
      {focus.momentum && (
        <div className="px-4 py-3 bg-[#22c55e]/[0.04] border border-[#22c55e]/[0.12] rounded-md">
          <p className="text-[11px] text-[#4ade80] font-light leading-relaxed">
            ✦ {focus.momentum}
          </p>
        </div>
      )}
    </div>
  )
}