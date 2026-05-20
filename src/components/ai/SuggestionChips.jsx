export default function SuggestionChips({ prompts, onSelect, disabled }) {
  if (!prompts?.length) return null

  return (
    <div className="flex flex-wrap gap-2" role="list" aria-label="Suggested prompts">
      {prompts.map((p, i) => (
        <button
          key={p}
          type="button"
          role="listitem"
          disabled={disabled}
          onClick={() => onSelect(p)}
          className="ai-chip px-3 py-2 rounded-full text-[13px] font-medium border border-jos-border bg-jos-surface text-jos-muted hover:text-jos-text disabled:opacity-40"
          style={{ animationDelay: `${i * 50}ms` }}
        >
          {p}
        </button>
      ))}
    </div>
  )
}
