import { useState } from 'react'
import Button from './ui/Button'
import { askClaude } from '../lib/claude'

export default function TaskUpdatePanel({ task, allTasks, projectName, onApply, onCancel }) {
  const [update, setUpdate] = useState('')
  const [thinking, setThinking] = useState(false)
  const [result, setResult] = useState(null)

  const handleSubmit = async () => {
    if (!update.trim()) return
    setThinking(true)
    setResult(null)

    const sys = `You are a sharp project manager AI. A user reports a real-world update on a task.
Analyse and return ONLY valid JSON — no markdown outside:
{
  "summary": "One sentence explaining your decision",
  "actions": [
    {
      "type": "remove" | "replace" | "mark_blocked" | "add" | "keep",
      "taskId": "id of affected task (for remove/replace/mark_blocked/keep)",
      "newText": "new text (for replace or add)",
      "note": "short reason (for mark_blocked or replace)"
    }
  ]
}
Rules:
- "remove" = task no longer relevant
- "replace" = reword the task to fit new situation
- "mark_blocked" = task is blocked, stays visible
- "add" = insert new follow-up task
- Multiple actions allowed. Be decisive. Think like a PM.`

    const allTasksStr = allTasks
      .map((t, i) => `${i + 1}. [${t.done ? '✓' : t.blocked ? 'BLOCKED' : '○'}] "${t.text}" (id: ${t.id})`)
      .join('\n')

    const prompt = `Project: "${projectName}"
Tasks:
${allTasksStr}

User update on task "${task.text}" (id: ${task.id}):
"${update}"`

    const parsed = await askClaude([{ role: 'user', content: prompt }], sys, true)

    setThinking(false)

    if (!parsed) {
      setResult({ error: true })
      return
    }

    setResult(parsed)
  }

  return (
    <div className="mt-3 bg-[#181818] border border-[#2a2a2a] rounded-md p-4 animate-fadeUp">
      <p className="text-[10px] tracking-[0.16em] uppercase text-[#444] font-medium mb-1.5">
        AI Task Update
      </p>
      <p className="text-[13px] text-[#e8e8e8] font-normal mb-3 leading-relaxed">
        Task: "{task.text}"
      </p>

      <textarea
        className="w-full bg-[#111] border border-[#2a2a2a] rounded py-3 px-4 text-white text-[13px] font-light outline-none focus:border-[#333] placeholder:text-[#444] resize-y min-h-[70px] mb-3"
        placeholder="What happened? Tell me the situation — I'll re-plan accordingly."
        value={update}
        onChange={e => setUpdate(e.target.value)}
        disabled={thinking}
      />

      <div className="flex items-center gap-2 flex-wrap mb-2">
        <Button variant="solid" size="sm" onClick={handleSubmit} disabled={thinking || !update.trim()}>
          {thinking ? 'Re-planning…' : 'Re-plan with AI'}
        </Button>
        <Button variant="muted" size="xs" onClick={onCancel}>Cancel</Button>
      </div>

      {/* Result */}
      {result?.error && (
        <p className="text-[12px] text-[#f87171] font-light mt-2">Could not parse response. Try again.</p>
      )}

      {result && !result.error && (
        <div className="mt-4 pt-4 border-t border-[#1f1f1f]">
          <p className="text-[10px] tracking-[0.14em] uppercase text-[#444] font-medium mb-2">
            AI Decision
          </p>
          <p className="text-[13px] text-[#e8e8e8] font-light leading-relaxed mb-3">
            {result.summary}
          </p>

          <Button
            variant="green"
            size="sm"
            onClick={() => onApply(result.actions)}
          >
            Apply Changes
          </Button>
        </div>
      )}
    </div>
  )
}