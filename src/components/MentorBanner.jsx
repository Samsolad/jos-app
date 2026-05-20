import { useEffect, useRef } from 'react'
import useMentorStore from '../store/mentorStore'
import { speak } from '../lib/mentor'

const MODE_STYLES = {
  tough: {
    dot:   'bg-[#ef4444] animate-pulse',
    label: 'text-[#f87171]',
    border:'border-t-[#ef4444]',
    text:  'Accountability',
  },
  warm: {
    dot:   'bg-[#22c55e]',
    label: 'text-[#4ade80]',
    border:'border-t-[#22c55e]',
    text:  'Well done',
  },
  hype: {
    dot:   'bg-[#f59e0b] animate-pulse',
    label: 'text-[#fbbf24]',
    border:'border-t-[#f59e0b]',
    text:  "Let's go",
  },
  wise: {
    dot:   'bg-[#3b82f6]',
    label: 'text-[#60a5fa]',
    border:'border-t-[#3b82f6]',
    text:  'Insight',
  },
  pa: {
    dot:   'bg-white',
    label: 'text-[#888]',
    border:'border-t-white',
    text:  'Briefing',
  },
}

const DEFAULT_MODE = MODE_STYLES.pa

export default function MentorBanner() {
  const message   = useMentorStore(s => s.message)
  const situation = useMentorStore(s => s.situation)
  const visible   = useMentorStore(s => s.visible)
  const actions   = useMentorStore(s => s.actions)
  const dismiss   = useMentorStore(s => s.dismiss)

  const spokenRef = useRef(null)

  // Safe mode lookup — never undefined
  const mode = (situation && MODE_STYLES[situation])
    ? MODE_STYLES[situation]
    : DEFAULT_MODE

  useEffect(() => {
    if (visible && message && message !== spokenRef.current) {
      spokenRef.current = message
      speak(message, situation || 'pa')
    }
    if (!visible && window.speechSynthesis) {
      window.speechSynthesis.cancel()
    }
  }, [visible, message, situation])

  if (!visible || !message) return null

  return (
    <div
      className={`fixed bottom-[calc(4.5rem+env(safe-area-inset-bottom)+8px)] md:bottom-4 left-1/2 -translate-x-1/2 z-40 w-[calc(100%-24px)] max-w-[540px] bg-jos-surface border border-jos-border border-t-2 ${mode.border} rounded-lg shadow-2xl animate-fadeUp`}
    >
      <div className="flex items-start gap-3 p-4">
        <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${mode.dot}`} />
        <div className="flex-1 min-w-0">
          <p className={`text-[9px] tracking-[0.18em] uppercase font-semibold mb-1 ${mode.label}`}>
            {mode.text}
          </p>
          <p className="text-[13px] text-[#e8e8e8] font-light leading-relaxed">
            {message}
          </p>
          {actions && actions.length > 0 && (
            <div className="flex gap-2 mt-3 flex-wrap">
              {actions.map((a, i) => (
                <button
                  key={i}
                  onClick={() => { a.fn(); dismiss() }}
                  className="px-3 py-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase border border-[#2a2a2a] text-[#888] rounded hover:border-[#333] hover:text-white transition-all"
                >
                  {a.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          onClick={dismiss}
          className="text-[#444] hover:text-[#888] text-[14px] flex-shrink-0 transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  )
}