import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import useProjectStore from '../../store/projectStore'
import useGoalStore from '../../store/goalStore'
import useHabitStore from '../../store/habitStore'
import useSocialStore from '../../store/socialStore'
import useFamilyStore from '../../store/familyStore'
import { sectionsFromOnboarding } from '../../lib/dashboardPrefs'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

const PLATFORMS = ['LinkedIn', 'Instagram', 'X', 'TikTok', 'YouTube', 'Facebook', 'Threads']
const CURRENCIES = [
  { label: '£ GBP', value: '£' },
  { label: '$ USD', value: '$' },
  { label: '€ EUR', value: '€' },
  { label: '₦ NGN', value: '₦' },
  { label: 'R ZAR', value: 'R' },
  { label: '¥ JPY', value: '¥' },
]
const NOTIF_STYLES = [
  { id: 'strict', label: 'Strict', desc: 'Direct accountability — J·OS pushes hard' },
  { id: 'balanced', label: 'Balanced', desc: 'Mix of support and challenge' },
  { id: 'gentle', label: 'Gentle', desc: 'Warm encouragement, lighter nudges' },
]

const STEPS = [
  { key: 'role', title: 'What you do', subtitle: 'Role and who you work for (optional)' },
  { key: 'location', title: 'Where you are', subtitle: 'Location and timezone (optional)' },
  { key: 'projects', title: 'Your ventures', subtitle: 'Projects you are running now (optional)' },
  { key: 'goals', title: 'Big goals', subtitle: 'What you are trying to achieve (optional)' },
  { key: 'habits', title: 'Daily habits', subtitle: 'Habits you want to track (optional)' },
  { key: 'social', title: 'Social platforms', subtitle: 'Where you post (optional)' },
  { key: 'family', title: 'Stay connected', subtitle: 'People you want to keep in touch with (optional)' },
  { key: 'currency', title: 'Money tracking', subtitle: 'Currency for revenue (optional)' },
  { key: 'style', title: 'How J·OS speaks', subtitle: 'Reminder assertiveness (optional)' },
]

function parseLines(text) {
  return text.split('\n').map(s => s.trim()).filter(Boolean)
}

export default function OnboardingWizard() {
  const navigate = useNavigate()
  const { profile, completeOnboarding } = useAuthStore()
  const { addProject } = useProjectStore()
  const { addGoal } = useGoalStore()
  const { addHabit } = useHabitStore()
  const { addPlatform } = useSocialStore()
  const { addContact } = useFamilyStore()

  const [step, setStep] = useState(0)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const [form, setForm] = useState({
    role: '',
    employer: '',
    location: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
    projectsText: '',
    goalsText: '',
    habitsText: '',
    platforms: [],
    familyText: '',
    currency: '£',
    notif_style: 'balanced',
  })

  const cur = STEPS[step]
  const progress = ((step + 1) / STEPS.length) * 100

  const togglePlatform = (p) => {
    setForm(s => ({
      ...s,
      platforms: s.platforms.includes(p) ? s.platforms.filter(x => x !== p) : [...s.platforms, p],
    }))
  }

  const seedOnboardingData = async (projects, goals, habits, platforms, familyLines) => {
    const tasks = [
      ...projects.slice(0, 10).map((name) =>
        addProject(name, 'Active', '', { skipLimit: true }).catch(() => null),
      ),
      ...goals.slice(0, 10).map((text) =>
        addGoal({ text, category: 'Personal', steps: [] }).catch(() => null),
      ),
      ...habits.slice(0, 10).map((name) =>
        addHabit(name, 'daily').catch(() => null),
      ),
      ...platforms.map((platform) =>
        addPlatform(platform).catch(() => null),
      ),
      ...familyLines.slice(0, 10).map((line) =>
        addContact(line).catch(() => null),
      ),
    ]
    await Promise.allSettled(tasks)
  }

  const finish = async () => {
    setSaving(true)
    setSaveError('')
    const projects = parseLines(form.projectsText)
    const goals = parseLines(form.goalsText)
    const habits = parseLines(form.habitsText)
    const familyLines = parseLines(form.familyText)
    const roleCombined = [form.role, form.employer].filter(Boolean).join(' · ')

    const onboardingAnswers = {
      projects, goals, habits,
      socialPlatforms: form.platforms,
      familyContacts: familyLines,
      trackMoney: true,
      focusAreas: [
        projects.length && 'projects',
        goals.length && 'goals',
        habits.length && 'habits',
        form.platforms.length && 'social',
        familyLines.length && 'family',
        'revenue',
      ].filter(Boolean),
    }

    try {
      const completed = await completeOnboarding({
        name: profile?.name,
        role: roleCombined || profile?.role,
        location: form.location || profile?.location,
        timezone: form.timezone || profile?.timezone,
        currency: form.currency,
        notif_style: form.notif_style,
        onboarding_completed: true,
        preferences: {
          sections: sectionsFromOnboarding(onboardingAnswers),
          onboarding: onboardingAnswers,
          completedAt: new Date().toISOString(),
        },
      })

      if (!completed) {
        throw new Error('Could not save your setup. Check your connection and try again.')
      }

      await seedOnboardingData(projects, goals, habits, form.platforms, familyLines)
      navigate('/', { replace: true })
    } catch (err) {
      setSaveError(err?.message || 'Something went wrong finishing setup.')
    } finally {
      setSaving(false)
    }
  }

  const next = () => (step < STEPS.length - 1 ? setStep(s => s + 1) : finish())
  const skip = () => (step < STEPS.length - 1 ? setStep(s => s + 1) : finish())

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col">
      <div className="px-6 pt-8 pb-4 border-b border-[#1f1f1f]">
        <p className="text-[10px] tracking-[0.2em] uppercase text-[#444] font-medium mb-2">
          Setup · Step {step + 1} of {STEPS.length}
        </p>
        <div className="h-px bg-[#1f1f1f] rounded overflow-hidden mb-6">
          <div className="h-full bg-white transition-all duration-300" style={{ width: `${progress}%` }} />
        </div>
        <h1 className="font-serif text-[24px] font-bold mb-1">{cur.title}</h1>
        <p className="text-[13px] text-[#888] font-light">{cur.subtitle}</p>
      </div>

      <div className="flex-1 overflow-y-auto px-6 py-6 max-w-lg mx-auto w-full">
        {cur.key === 'role' && (
          <>
            <Input label="What do you do?" placeholder="Founder, operator, student…" value={form.role} onChange={e => setForm(s => ({ ...s, role: e.target.value }))} />
            <Input label="Who do you work for?" placeholder="Your company or clients (optional)" value={form.employer} onChange={e => setForm(s => ({ ...s, employer: e.target.value }))} />
          </>
        )}
        {cur.key === 'location' && (
          <>
            <Input label="Where are you based?" placeholder="City, country" value={form.location} onChange={e => setForm(s => ({ ...s, location: e.target.value }))} />
            <Input label="Timezone" placeholder="Europe/London" value={form.timezone} onChange={e => setForm(s => ({ ...s, timezone: e.target.value }))} />
          </>
        )}
        {cur.key === 'projects' && (
          <div>
            <p className="text-[11px] text-[#444] mb-2">One project per line</p>
            <textarea className="w-full bg-[#111] border border-[#2a2a2a] rounded-md py-3 px-4 text-white text-[13px] font-light outline-none focus:border-[#333] min-h-[140px] resize-none" placeholder={'Transport Team\nAquagroove'} value={form.projectsText} onChange={e => setForm(s => ({ ...s, projectsText: e.target.value }))} />
          </div>
        )}
        {cur.key === 'goals' && (
          <div>
            <p className="text-[11px] text-[#444] mb-2">One goal per line</p>
            <textarea className="w-full bg-[#111] border border-[#2a2a2a] rounded-md py-3 px-4 text-white text-[13px] font-light outline-none focus:border-[#333] min-h-[140px] resize-none" placeholder="Land 10 paying customers in 3 months" value={form.goalsText} onChange={e => setForm(s => ({ ...s, goalsText: e.target.value }))} />
          </div>
        )}
        {cur.key === 'habits' && (
          <div>
            <p className="text-[11px] text-[#444] mb-2">One habit per line</p>
            <textarea className="w-full bg-[#111] border border-[#2a2a2a] rounded-md py-3 px-4 text-white text-[13px] font-light outline-none focus:border-[#333] min-h-[120px] resize-none" placeholder="Morning workout" value={form.habitsText} onChange={e => setForm(s => ({ ...s, habitsText: e.target.value }))} />
          </div>
        )}
        {cur.key === 'social' && (
          <div className="flex flex-wrap gap-2">
            {PLATFORMS.map(p => (
              <button key={p} type="button" onClick={() => togglePlatform(p)} className={`px-3 py-2 rounded-md text-[12px] font-medium border transition-colors ${form.platforms.includes(p) ? 'bg-white text-[#080808] border-white' : 'bg-[#111] text-[#888] border-[#2a2a2a] hover:border-[#333]'}`}>{p}</button>
            ))}
          </div>
        )}
        {cur.key === 'family' && (
          <div>
            <p className="text-[11px] text-[#444] mb-2">Name — relationship (one per line)</p>
            <textarea className="w-full bg-[#111] border border-[#2a2a2a] rounded-md py-3 px-4 text-white text-[13px] font-light outline-none focus:border-[#333] min-h-[120px] resize-none" placeholder="Mum — weekly check-in" value={form.familyText} onChange={e => setForm(s => ({ ...s, familyText: e.target.value }))} />
          </div>
        )}
        {cur.key === 'currency' && (
          <div className="grid grid-cols-2 gap-2">
            {CURRENCIES.map(c => (
              <button key={c.value} type="button" onClick={() => setForm(s => ({ ...s, currency: c.value }))} className={`px-4 py-3 rounded-md text-[13px] font-medium border transition-colors ${form.currency === c.value ? 'bg-white text-[#080808] border-white' : 'bg-[#111] text-[#888] border-[#2a2a2a]'}`}>{c.label}</button>
            ))}
          </div>
        )}
        {cur.key === 'style' && (
          <div className="space-y-2">
            {NOTIF_STYLES.map(s => (
              <button key={s.id} type="button" onClick={() => setForm(f => ({ ...f, notif_style: s.id }))} className={`w-full text-left px-4 py-3 rounded-md border transition-colors ${form.notif_style === s.id ? 'bg-white/10 border-white/30' : 'bg-[#111] border-[#1f1f1f] hover:border-[#2a2a2a]'}`}>
                <p className="text-[13px] font-semibold">{s.label}</p>
                <p className="text-[11px] text-[#888] font-light mt-0.5">{s.desc}</p>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="px-6 py-5 border-t border-[#1f1f1f] max-w-lg mx-auto w-full">
        {saveError && (
          <p className="text-[11px] text-red-400 mb-3">{saveError}</p>
        )}
        <div className="flex gap-2">
          <button type="button" onClick={skip} disabled={saving} className="flex-1 py-3 text-[11px] font-semibold tracking-[0.1em] uppercase text-[#888] border border-[#2a2a2a] rounded hover:text-white transition-colors">Skip</button>
          <Button type="button" size="full" className="flex-[2]" disabled={saving} onClick={next}>{saving ? 'Building your OS…' : step === STEPS.length - 1 ? 'Finish' : 'Continue'}</Button>
        </div>
      </div>
    </div>
  )
}
