import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import useProjectStore from '../../store/projectStore'
import useGoalStore from '../../store/goalStore'
import useHabitStore from '../../store/habitStore'
import useRevenueStore from '../../store/revenueStore'
import Badge from '../../components/ui/Badge'
import RemindersPanel from '../../components/RemindersPanel'
import useReminderStore from '../../store/reminderStore'

function StatBox({ label, value, color = 'white', sub }) {
  const colors = {
    white: 'text-white',
    green: 'text-[#4ade80]',
    red: 'text-[#f87171]',
    amber: 'text-[#fbbf24]',
    blue: 'text-[#60a5fa]',
    dim: 'text-[#444]',
  }
  return (
    <div className="bg-[#111] border border-[#1f1f1f] rounded-md p-3 sm:p-4 text-center">
      <p className="text-[9px] sm:text-[10px] tracking-[0.14em] uppercase text-[#444] font-medium mb-2">{label}</p>
      <p className={`font-serif text-[22px] sm:text-[26px] font-bold leading-none ${colors[color]}`}>{value}</p>
      {sub && <p className="text-[10px] text-[#444] mt-1.5">{sub}</p>}
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <p className="text-[10px] tracking-[0.2em] uppercase text-[#444] font-medium mb-3">{children}</p>
  )
}

export default function Dashboard() {
  const navigate = useNavigate()
  const profile = useAuthStore(s => s.profile)
  const { projects, fetchProjects } = useProjectStore()
  const { goals, fetchGoals } = useGoalStore()
  const { habits, logs, fetchHabits, isLoggedToday } = useHabitStore()
  const { entries, fetchEntries, getTotals } = useRevenueStore()
  const { fetchReminders } = useReminderStore()

  useEffect(() => {
    fetchProjects()
    fetchGoals()
    fetchHabits()
    fetchEntries()
    fetchReminders()
  }, [])

  const firstName = profile?.name?.split(' ')[0] || 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'
  const cur = profile?.currency || '£'

  // Projects summary
  const allTasks = projects.map(p => []).flat() // placeholder — tasks loaded on project open
  const activeProjects = projects.filter(p => p.status === 'Active' || p.status === 'active')

  // Goals summary
  const activeGoals = goals.filter(g => !g.done)
  const doneGoals = goals.filter(g => g.done)

  // Habits today
  const habitsDoneToday = habits.filter(h => isLoggedToday(h.id)).length

  // Revenue
  const { inn, out, net } = getTotals(entries)
  const fmt = (n) => `${cur}${Number(n).toLocaleString()}`

  // Days until goal deadlines
  const urgentGoals = activeGoals.filter(g => {
    if (!g.deadline) return false
    const days = Math.ceil((new Date(g.deadline) - new Date()) / 86400000)
    return days <= 30
  })

  return (
    <div className="animate-fadeUp">
      {/* Greeting */}
      <p className="text-[10px] tracking-[0.2em] uppercase text-[#444] font-medium mb-2">Command Hub</p>
      <h1 className="font-serif text-[24px] sm:text-[26px] font-bold mb-1">
        Good {greeting}, <em className="text-[#e8e8e8]">{firstName}</em>.
      </h1>
      {profile?.role && (
        <p className="text-[13px] text-[#888] font-light mb-6">{profile.role}{profile.location ? ` · ${profile.location}` : ''}</p>
      )}
      {!profile?.role && (
        <p className="text-[13px] text-[#888] font-light mb-6">Here is everything across your OS.</p>
      )}

      <div className="h-px bg-[#1f1f1f] mb-6" />

{/* Reminders & Meetings */}
<div className="mb-8">
  <RemindersPanel />
</div>

{/* Key stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-8">
        <StatBox label="Projects" value={projects.length} sub={`${activeProjects.length} active`} />
        <StatBox
          label="Goals"
          value={activeGoals.length}
          color={urgentGoals.length > 0 ? 'amber' : 'white'}
          sub={doneGoals.length > 0 ? `${doneGoals.length} achieved` : 'in progress'}
        />
        <StatBox
          label="Habits Today"
          value={`${habitsDoneToday}/${habits.length}`}
          color={habits.length > 0 && habitsDoneToday === habits.length ? 'green' : 'white'}
        />
        <StatBox
          label="Net Revenue"
          value={fmt(net)}
          color={net >= 0 ? 'green' : 'red'}
        />
      </div>

      {/* Projects */}
      {projects.length > 0 && (
        <div className="mb-8">
          <SectionTitle>Projects</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 sm:gap-3">
            {projects.slice(0, 6).map(p => (
              <button
                key={p.id}
                onClick={() => navigate('/projects')}
                className="bg-[#111] border border-[#1f1f1f] rounded-md p-4 text-left hover:border-[#2a2a2a] transition-colors"
              >
                <div className="flex items-start justify-between mb-2">
                  <p className="text-[13px] font-semibold truncate flex-1">{p.name}</p>
                  <Badge color="dim" className="ml-2 flex-shrink-0">{p.status}</Badge>
                </div>
                {p.notes && <p className="text-[11px] text-[#444] font-light line-clamp-1">{p.notes}</p>}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Goals */}
      {activeGoals.length > 0 && (
        <div className="mb-8">
          <SectionTitle>Active Goals</SectionTitle>
          <div className="space-y-2">
            {activeGoals.slice(0, 4).map(g => {
              const steps = g.goal_steps || []
              const done = steps.filter(s => s.done).length
              const pct = steps.length ? Math.round((done / steps.length) * 100) : 0
              const days = g.deadline
                ? Math.ceil((new Date(g.deadline) - new Date()) / 86400000)
                : null

              return (
                <button
                  key={g.id}
                  onClick={() => navigate('/goals')}
                  className="w-full bg-[#111] border border-[#1f1f1f] rounded-md p-4 text-left hover:border-[#2a2a2a] transition-colors"
                >
                  <div className="flex items-start justify-between gap-3 mb-2">
                    <p className="text-[13px] font-medium flex-1">{g.text}</p>
                    {days !== null && (
                      <span className={`text-[10px] font-medium flex-shrink-0 ${days <= 7 ? 'text-[#f87171]' : days <= 30 ? 'text-[#fbbf24]' : 'text-[#444]'}`}>
                        {days}d left
                      </span>
                    )}
                  </div>
                  {steps.length > 0 && (
                    <div>
                      <div className="flex justify-between text-[10px] text-[#444] mb-1">
                        <span>{done}/{steps.length} steps</span>
                        <span>{pct}%</span>
                      </div>
                      <div className="h-px bg-[#1f1f1f]">
                        <div className="h-full bg-white transition-all" style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Habits today */}
      {habits.length > 0 && (
        <div className="mb-8">
          <SectionTitle>Habits — Today</SectionTitle>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {habits.slice(0, 6).map(h => {
              const done = isLoggedToday(h.id)
              return (
                <button
                  key={h.id}
                  onClick={() => navigate('/habits')}
                  className={`flex items-center justify-between px-4 py-3 rounded-md border text-left transition-all ${
                    done
                      ? 'bg-[#22c55e]/[0.04] border-[#22c55e]/20'
                      : 'bg-[#111] border-[#1f1f1f] hover:border-[#2a2a2a]'
                  }`}
                >
                  <span className={`text-[13px] font-medium ${done ? 'text-[#4ade80]' : 'text-white'}`}>
                    {h.name}
                  </span>
                  <span className={`text-[11px] font-semibold tracking-wider uppercase ${done ? 'text-[#4ade80]' : 'text-[#444]'}`}>
                    {done ? '✓ Done' : 'Log →'}
                  </span>
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Revenue snapshot */}
      {entries.length > 0 && (
        <div className="mb-8">
          <SectionTitle>Revenue Snapshot</SectionTitle>
          <div className="grid grid-cols-3 gap-2">
            <div className="bg-[#111] border border-[#1f1f1f] rounded-md p-3 text-center">
              <p className="text-[9px] tracking-[0.14em] uppercase text-[#444] mb-1.5">In</p>
              <p className="font-serif text-[18px] font-bold text-[#4ade80]">{fmt(inn)}</p>
            </div>
            <div className="bg-[#111] border border-[#1f1f1f] rounded-md p-3 text-center">
              <p className="text-[9px] tracking-[0.14em] uppercase text-[#444] mb-1.5">Out</p>
              <p className="font-serif text-[18px] font-bold text-[#f87171]">{fmt(out)}</p>
            </div>
            <div className="bg-[#111] border border-[#1f1f1f] rounded-md p-3 text-center">
              <p className="text-[9px] tracking-[0.14em] uppercase text-[#444] mb-1.5">Net</p>
              <p className={`font-serif text-[18px] font-bold ${net >= 0 ? 'text-[#4ade80]' : 'text-[#f87171]'}`}>{fmt(net)}</p>
            </div>
          </div>
        </div>
      )}

      {/* Empty state — brand new user */}
      {projects.length === 0 && goals.length === 0 && habits.length === 0 && (
        <div className="bg-[#111] border border-[#1f1f1f] rounded-md p-6 sm:p-8">
          <p className="text-[10px] tracking-[0.2em] uppercase text-[#444] font-medium mb-3">Get Started</p>
          <p className="font-serif text-[20px] font-bold mb-2">
            Your OS is <em className="text-[#e8e8e8]">ready</em>.
          </p>
          <p className="text-[13px] text-[#888] font-light leading-relaxed mb-5">
            Start by adding a project, setting a goal, or tracking a habit. Your dashboard will build itself around your data.
          </p>
          <div className="flex flex-wrap gap-2">
            {[
              { label: '+ Add Project', path: '/projects' },
              { label: '+ Set a Goal', path: '/goals' },
              { label: '+ Track a Habit', path: '/habits' },
            ].map(btn => (
              <button
                key={btn.path}
                onClick={() => navigate(btn.path)}
                className="px-4 py-2 text-[11px] font-semibold tracking-[0.1em] uppercase bg-white text-[#080808] rounded hover:bg-[#e8e8e8] transition-colors"
              >
                {btn.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}