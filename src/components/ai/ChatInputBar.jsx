import { useRef } from 'react'
import GradientOrb from './GradientOrb'
import SuggestionChips from './SuggestionChips'

const STATE_LABELS = {
  idle: 'Ask me anything…',
  listening: 'Listening…',
  thinking: 'Thinking…',
  responding: 'Responding…',
}

export default function ChatInputBar({
  value,
  onChange,
  onSend,
  onVoiceStart,
  loading,
  disabled,
  aiState = 'idle',
  quickPrompts,
  showChips,
}) {
  const inputRef = useRef(null)

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      onSend()
    }
  }

  const handleInput = (e) => {
    onChange(e.target.value)
    e.target.style.height = 'auto'
    e.target.style.height = `${Math.min(e.target.scrollHeight, 120)}px`
  }

  return (
    <div className="flex-shrink-0 border-t border-jos-border bg-jos-bg/95 backdrop-blur-md pt-3 pb-[env(safe-area-inset-bottom)]">
      {showChips && quickPrompts?.length > 0 && (
        <div className="px-4 pb-3 max-w-3xl mx-auto">
          <SuggestionChips
            prompts={quickPrompts}
            onSelect={(p) => onSend(p)}
            disabled={loading || disabled}
          />
        </div>
      )}

      <div className="px-4 pb-3 max-w-3xl mx-auto">
        <div className="flex items-end gap-2 mb-2">
          <GradientOrb state={loading ? 'thinking' : aiState} size="sm" className="mb-2 hidden sm:block" />
          <span className="text-[11px] text-jos-muted mb-2" aria-live="polite">
            {loading ? STATE_LABELS.thinking : STATE_LABELS[aiState] || STATE_LABELS.idle}
          </span>
        </div>

        <div className="flex gap-2 items-end">
          {onVoiceStart && (
            <button
              type="button"
              onClick={onVoiceStart}
              disabled={loading || disabled}
              className="flex-shrink-0 w-11 h-11 rounded-full border border-jos-border flex items-center justify-center text-jos-muted hover:text-jos-accent hover:border-jos-accent transition-colors disabled:opacity-40"
              aria-label="Voice input"
              title="Voice input"
            >
              <span className="text-lg" aria-hidden>🎤</span>
            </button>
          )}
          <textarea
            ref={inputRef}
            className="flex-1 min-h-[44px] max-h-[120px] py-3 px-4 rounded-xl border border-jos-border bg-jos-surface text-jos-text text-[15px] resize-none"
            rows={1}
            placeholder={loading ? STATE_LABELS.thinking : STATE_LABELS.idle}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onKeyDown={handleKeyDown}
            onInput={handleInput}
            disabled={loading || disabled}
            aria-label="Message to AI assistant"
          />
          <button
            type="button"
            onClick={() => onSend()}
            disabled={loading || disabled || !value.trim()}
            className="ai-btn-glow flex-shrink-0 w-11 h-11 rounded-full bg-jos-gradient text-white font-semibold flex items-center justify-center disabled:opacity-40 transition-all"
            aria-label="Send message"
          >
            →
          </button>
        </div>
      </div>
    </div>
  )
}
