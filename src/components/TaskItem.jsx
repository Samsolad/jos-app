import Button from './ui/Button'
import { getTaskMeta, taskIsPaid, taskEstimatedCost } from '../lib/taskMeta'

export default function TaskItem({ task, onToggle, onUpdate, onDelete, blockedByDep }) {
  const meta = getTaskMeta(task)
  const paid = taskIsPaid(task) && taskEstimatedCost(task) > 0

  const statusColor = task.blocked || blockedByDep
    ? 'border-[#f59e0b] bg-[#f59e0b1f]'
    : task.done
      ? 'border-white bg-white'
      : paid
        ? 'border-[#ef4444] bg-[#ef44441a]'
        : 'border-[#2a2a2a] bg-transparent'

  const textColor = task.blocked || blockedByDep
    ? 'text-[#fbbf24]'
    : task.done
      ? 'text-[#444]'
      : paid
        ? 'text-[#f87171]'
        : 'text-[#e8e8e8]'

  return (
    <div className={`flex items-start gap-3 py-3 border-b border-[#1f1f1f] ${task.done ? 'opacity-35' : ''}`}>
      <button
        onClick={onToggle}
        disabled={blockedByDep}
        className={`w-[14px] h-[14px] rounded-[3px] border flex-shrink-0 flex items-center justify-center mt-0.5 transition-all ${statusColor} ${blockedByDep ? 'opacity-40 cursor-not-allowed' : ''}`}
      >
        {(task.done || task.blocked || blockedByDep) && (
          <span className={`text-[9px] font-bold ${task.done ? 'text-[#080808]' : 'text-[#f59e0b]'}`}>
            {task.done ? '✓' : '⊘'}
          </span>
        )}
      </button>

      <div className="flex-1 min-w-0">
        <p className={`text-[13px] font-light leading-relaxed ${task.done ? 'line-through' : ''} ${textColor}`}>
          {task.text}
          {paid && (
            <span className="ml-2 text-[9px] font-bold uppercase text-[#ef4444]">
              £{taskEstimatedCost(task)}
            </span>
          )}
        </p>
        {meta.lean_alternative && !task.done && (
          <p className="text-[10px] text-[#4ade80] mt-0.5">Lean: {meta.lean_alternative}</p>
        )}
        {blockedByDep && (
          <p className="text-[10px] text-[#fbbf24] mt-0.5">Blocked until prerequisite is done</p>
        )}
        {task.due_date && !task.done && (
          <p className="text-[10px] text-[#444] mt-0.5">📅 {task.due_date}</p>
        )}
        {task.update_note && (
          <p className="text-[11px] text-[#888] mt-1 font-light italic">↳ {task.update_note}</p>
        )}
        {task.added_by_ai && !task.done && (
          <span className="text-[9px] text-[#3b82f6] font-medium tracking-wider uppercase mt-1 inline-block">
            Navigator
          </span>
        )}
      </div>

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
