import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  MAX_AUTO_SHOW_VISITS,
  getHowItWorksUiStored,
  getSessionHowItWorksVisitIndex,
  recordHowItWorksVisit,
  setHowItWorksUiMode,
  shouldShowHowItWorksGuide,
} from '../lib/howItWorksGuide'

const STEPS = [
  {
    title: 'Create your OS',
    body: 'Register and run the setup wizard — role, projects, goals, habits, and how you want J·OS to speak to you.',
  },
  {
    title: 'Command Hub',
    body: 'Your dashboard picks what matters today: daily focus, next action, reminders, and a priority-ranked task view.',
  },
  {
    title: 'Capture & execute',
    body: 'Add projects and tasks, set goals with steps, log habits, and use Navigator to turn messy input into a lean plan.',
  },
  {
    title: 'AI assistant',
    body: 'Chat with context from your profile and memory. Free tier includes limited messages per day; upgrade for more.',
  },
  {
    title: 'Life & business modules',
    body: 'Track revenue, social drafts, family check-ins, and (on Operator+) Gmail, Calendar, and WhatsApp paste-to-actions.',
  },
]

export default function HowItWorksGuide() {
  const initialized = useRef(false)
  const [active, setActive] = useState(false)
  const [mode, setMode] = useState('hidden')
  const [visitIndex, setVisitIndex] = useState(0)
  const [beyondAutoVisits, setBeyondAutoVisits] = useState(false)

  useEffect(() => {
    if (initialized.current) return
    initialized.current = true

    const stored = getHowItWorksUiStored()
    const pastAuto = !shouldShowHowItWorksGuide()

    if (pastAuto) {
      setBeyondAutoVisits(true)
      setVisitIndex(0)
      setActive(true)
      if (stored === 'expanded') setMode('expanded')
      else if (stored === 'closed') setMode('hidden')
      else setMode('minimized')
      return
    }

    const visit = getSessionHowItWorksVisitIndex() || recordHowItWorksVisit()
    if (!visit) return

    setVisitIndex(visit)
    setActive(true)
    if (stored === 'minimized') setMode('minimized')
    else if (stored === 'closed') setMode('hidden')
    else setMode('expanded')
  }, [])

  const minimize = () => {
    setHowItWorksUiMode('minimized')
    setMode('minimized')
  }

  const closeForSession = () => {
    setHowItWorksUiMode('closed')
    setMode('hidden')
  }

  const expand = () => {
    setHowItWorksUiMode('expanded')
    setMode('expanded')
  }

  const pill = (
    <button
      type="button"
      onClick={expand}
      className="fixed z-[60] bottom-4 right-4 sm:bottom-6 sm:right-6 flex items-center gap-2 px-4 py-3 rounded-full bg-[#111] border border-[#2a2a2a] text-white shadow-lg hover:border-[#444] transition-colors max-w-[calc(100vw-2rem)]"
      style={{ marginBottom: 'env(safe-area-inset-bottom)', marginRight: 'env(safe-area-inset-right)' }}
      aria-label="Open how J·OS works"
    >
      <span className="w-7 h-7 rounded-full bg-white text-[#080808] text-[13px] font-bold flex items-center justify-center flex-shrink-0">
        ?
      </span>
      <span className="text-[12px] font-semibold tracking-wide">How J·OS works</span>
    </button>
  )

  if (!active) return null

  if (beyondAutoVisits && mode === 'hidden') {
    return pill
  }

  if (!beyondAutoVisits && mode === 'hidden') return null

  if (mode === 'minimized') return pill

  return (
    <>
      <div
        className="fixed inset-0 z-[58] bg-black/60 backdrop-blur-[2px]"
        aria-hidden
        onClick={minimize}
      />
      <div
        role="dialog"
        aria-labelledby="how-it-works-title"
        aria-modal="true"
        className="fixed z-[59] left-4 right-4 sm:left-auto sm:right-6 sm:bottom-6 sm:top-auto sm:max-w-md bottom-4 sm:translate-y-0 mx-auto max-h-[min(85vh,640px)] flex flex-col rounded-lg border border-[#2a2a2a] bg-[#0d0d0d] shadow-2xl overflow-hidden"
        style={{
          marginBottom: 'max(1rem, env(safe-area-inset-bottom))',
        }}
      >
        <div className="flex items-start justify-between gap-3 px-5 pt-5 pb-3 border-b border-[#1f1f1f]">
          <div>
            <p className="text-[10px] tracking-[0.2em] uppercase text-[#444] font-medium mb-1">
              {visitIndex > 0
                ? `Welcome · visit ${visitIndex} of ${MAX_AUTO_SHOW_VISITS}`
                : 'Welcome'}
            </p>
            <h2 id="how-it-works-title" className="font-serif text-[20px] font-bold leading-snug">
              How J·OS works
            </h2>
          </div>
          <div className="flex items-center gap-1 flex-shrink-0">
            <button
              type="button"
              onClick={minimize}
              className="p-2 text-[#888] hover:text-white rounded transition-colors"
              title="Minimize to corner"
              aria-label="Minimize"
            >
              <span className="text-[18px] leading-none">−</span>
            </button>
            <button
              type="button"
              onClick={closeForSession}
              className="p-2 text-[#888] hover:text-white rounded transition-colors"
              title="Close for now"
              aria-label="Close"
            >
              <span className="text-[18px] leading-none">×</span>
            </button>
          </div>
        </div>

        <ol className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {STEPS.map((step, i) => (
            <li key={step.title} className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full border border-[#333] text-[11px] font-bold flex items-center justify-center text-[#888]">
                {i + 1}
              </span>
              <div>
                <p className="text-[13px] font-semibold text-white mb-0.5">{step.title}</p>
                <p className="text-[12px] text-[#888] font-light leading-relaxed">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>

        <div className="px-5 py-4 border-t border-[#1f1f1f] flex flex-col sm:flex-row gap-2">
          <button
            type="button"
            onClick={minimize}
            className="flex-1 py-2.5 text-[11px] font-semibold tracking-[0.08em] uppercase text-[#888] border border-[#2a2a2a] rounded hover:text-white transition-colors"
          >
            Minimize
          </button>
          <Link
            to="/register"
            className="flex-[2] py-2.5 text-center text-[11px] font-semibold tracking-[0.08em] uppercase bg-white text-[#080808] rounded hover:bg-[#e8e8e8] transition-colors"
            onClick={closeForSession}
          >
            Create your OS
          </Link>
        </div>
      </div>
    </>
  )
}
