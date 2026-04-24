import Button from './ui/Button'

export default function TaskItem({ task, index, onToggle, onUpdate, onDelete }) {
  const statusColor = task.blocked
    ? 'border-[#f59e0b] bg-[#f59e0b1f]'
    : task.done
      ? 'border-white bg-white'
      : 'border-[#2a2a2a] bg-transparent'

  const textColor = task.blocked
    ? 'text-[#fbbf24]'
    : task.done
      ? 'text-[#444]'
      : 'text-[#e8e8e8]'

  return (
    <div className={`flex items-start gap-3 py-3 border-b border-[#1f1f1f] ${task.done ? 'opacity-35' : ''}`}>
      {/* Checkbox */}
      <button
        onClick={onToggle}
        className={`w-[14px] h-[14px] rounded-[3px] border flex-shrink-0 flex items-center justify-center mt-0.5 transition-all ${statusColor}`}
      >
        {(task.done || task.blocked) && (
          <span className={`text-[9px] font-bold ${task.done ? 'text-[#080808]' : 'text-[#f59e0b]'}`}>
            {task.done ? '✓' : '⊘'}
          </span>
        )}
      </button>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className={`text-[13px] font-light leading-relaxed ${task.done ? 'line-through' : ''} ${textColor}`}>
          {task.text}
        </p>
        {task.update_note && (
          <p className="text-[11px] text-[#888] mt-1 font-light italic">
            ↳ {task.update_note}
          </p>
        )}
        {task.added_by_ai && !task.done && (
          <span className="text-[9px] text-[#3b82f6] font-medium tracking-wider uppercase mt-1 inline-block">AI added</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-1.5 flex-shrink-0">
        {!task.done && (
          <Button variant="muted" size="xs" onClick={onUpdate}>
            Update
          </Button>
        )}
        <button
          onClick={onDelete}
          className="text-[#444] hover:text-[#888] text-[13px] px-1.5 transition-colors"
          title="Delete"
        >
          ✕
        </button>
      </div>
    </div>
  )
}