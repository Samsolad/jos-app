import { useState } from 'react'

const DEFAULT_STEPS = [
  { id: 'analyze', label: 'Analyzing your context…' },
  { id: 'search', label: 'Searching memory…' },
  { id: 'synth', label: 'Synthesizing response…' },
]

export default function ThinkingIndicator({
  steps = DEFAULT_STEPS,
  activeStep = 0,
  defaultOpen = true,
}) {
  const [open, setOpen] = useState(defaultOpen)

  return (
    <div className="rounded-lg border border-jos-border bg-jos-surface/80 overflow-hidden mb-3 max-w-md">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left hover:bg-jos-surface-2/50 transition-colors"
        aria-expanded={open}
      >
        <span className="text-[12px] font-medium text-jos-violet flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-jos-violet animate-pulse" aria-hidden />
          Thinking…
        </span>
        <span className="text-[10px] text-jos-muted">{open ? 'Hide' : 'Show'}</span>
      </button>
      {open && (
        <ul className="px-3 pb-3 space-y-1.5 border-t border-jos-border">
          {steps.map((step, i) => {
            const done = i < activeStep
            const active = i === activeStep
            return (
              <li
                key={step.id}
                className={`text-[12px] flex items-center gap-2 ${
                  done ? 'text-jos-success' : active ? 'text-jos-text' : 'text-jos-muted'
                }`}
              >
                <span className="w-4 text-center" aria-hidden>
                  {done ? '✓' : active ? '…' : '○'}
                </span>
                {step.label}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
