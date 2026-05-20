export default function TypingIndicator({ className = '' }) {
  return (
    <div
      className={`flex items-center gap-1.5 px-4 py-3 ${className}`}
      role="status"
      aria-live="polite"
      aria-label="AI is typing"
    >
      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="ai-typing-dot w-2 h-2 rounded-full bg-jos-accent"
        />
      ))}
    </div>
  )
}
