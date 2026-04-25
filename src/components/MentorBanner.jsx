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

export default function MentorBanner() {
  const { message, situation, visible, actions, dismiss } = useMentorStore()
  const spokenRef = useRef(null)

  const mode = MODE_STYLES[situation] || MODE_STYLES.pa

  // Speak when message changes
  useEffect(() => {
    if (visible && message && message !== spokenRef.current) {
      spokenRef.current = message
      speak(message, situation)
    }
    if (!visible) {
      window.speechSynthesis?.cancel()
    }
  }, [visible, message, situation])

  if (!visible) return null

  return (
    <div
      className={`fixed bottom-16 md:bottom-4 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-24px)] max-w-[540px] bg-[#111] border border-[#2a2a2a] ${mode.border} border-t-2 rounded-lg shadow-2xl animate-fadeUp`}
    >
      <div className="flex items-start gap-3 p-4">
        {/* Indicator dot */}
        <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ${mode.dot}`} />

        <div className="flex-1 min-w-0">
          {/* Label */}
          <p className={`text-[9px] tracking-[0.18em] uppercase font-semibold mb-1 ${mode.label}`}>
            {mode.text}
          </p>
          {/* Message */}
          <p className="text-[13px] text-[#e8e8e8] font-light leading-relaxed">
            {message}
          </p>
          {/* Action buttons */}
          {actions?.length > 0 && (
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

        {/* Dismiss */}
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