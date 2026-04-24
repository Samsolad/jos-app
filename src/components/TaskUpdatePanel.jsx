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
Return ONLY a raw JSON object — no markdown, no backticks, no explanation outside the JSON.
{
  "summary": "One sentence explaining your decision",
  "actions": [
    {
      "type": "remove" | "replace" | "mark_blocked" | "add" | "keep",
      "taskId": "exact task id string from the list",
      "newText": "new text (only for replace or add)",
      "note": "short reason (for mark_blocked or replace)"
    }
  ]
}
Rules:
- Use the EXACT taskId strings provided in the task list
- "remove" = task is no longer relevant, include taskId
- "replace" = reword the task, include taskId and newText
- "mark_blocked" = task is blocked, include taskId and note
- "add" = new follow-up task, use newText only, no taskId needed
- You can return multiple actions
- Be decisive. Think like a PM.`

    const allTasksStr = allTasks
      .map(t => `- id: "${t.id}" | status: ${t.done ? 'DONE' : t.blocked ? 'BLOCKED' : 'TODO'} | text: "${t.text}"`)
      .join('\n')

    const prompt = `Project: "${projectName}"

Current task list:
${allTasksStr}

The user is updating task with id: "${task.id}"
Task text: "${task.text}"

User's update:
"${update}"

Analyse this and decide what to do with the task list.`

    const parsed = await askClaude([{ role: 'user', content: prompt }], sys, true)

    setThinking(false)

    if (!parsed || !parsed.actions) {
      setResult({ error: true })
      return
    }

    // Validate actions — make sure taskIds exist in the task list
    const validIds = new Set(allTasks.map(t => t.id))
    const validatedActions = parsed.actions.map(action => {
      if (action.type === 'add') return action // add doesn't need taskId
      if (!action.taskId || !validIds.has(action.taskId)) {
        // If taskId is missing or invalid, try to match by current task
        if (['remove', 'replace', 'mark_blocked'].includes(action.type)) {
          return { ...action, taskId: task.id }
        }
      }
      return action
    })

    setResult({ ...parsed, actions: validatedActions })
  }

  return (
    <div className="mt-2 mb-2 bg-[#181818] border border-[#2a2a2a] rounded-md p-4 animate-fadeUp">
      <p className="text-[10px] tracking-[0.16em] uppercase text-[#444] font-medium mb-1.5">
        AI Task Update
      </p>
      <p className="text-[12px] text-[#888] font-light mb-3 leading-relaxed line-clamp-2">
        "{task.text}"
      </p>

      <textarea
        className="w-full bg-[#111] border border-[#2a2a2a] rounded py-2.5 px-3 text-white text-[13px] font-light outline-none focus:border-[#333] placeholder:text-[#444] resize-none mb-3"
        rows={3}
        placeholder="What happened? Tell me the situation — I'll re-plan."
        value={update}
        onChange={e => setUpdate(e.target.value)}
        disabled={thinking}
      />

      <div className="flex items-center gap-2 flex-wrap">
        <Button
          variant="solid"
          size="sm"
          onClick={handleSubmit}
          disabled={thinking || !update.trim()}
        >
          {thinking
            ? <><span className="w-3 h-3 border-2 border-[#08080833] border-t-[#080808] rounded-full animate-spin" /> Re-planning…</>
            : 'Re-plan with AI'
          }
        </Button>
        <Button variant="muted" size="xs" onClick={onCancel}>Cancel</Button>
      </div>

      {/* Error */}
      {result?.error && (
        <p className="text-[12px] text-[#f87171] font-light mt-3">
          Could not parse response. Try rephrasing.
        </p>
      )}

      {/* Result */}
      {result && !result.error && (
        <div className="mt-4 pt-4 border-t border-[#1f1f1f]">
          <p className="text-[10px] tracking-[0.14em] uppercase text-[#444] font-medium mb-2">
            AI Decision
          </p>
          <p className="text-[13px] text-[#e8e8e8] font-light leading-relaxed mb-3">
            {result.summary}
          </p>

          {/* Show what will change */}
          <div className="space-y-1.5 mb-4">
            {result.actions.map((a, i) => (
              <div key={i} className="flex items-start gap-2 text-[12px] font-light">
                <span className={
                  a.type === 'remove' ? 'text-[#f87171]' :
                  a.type === 'add' ? 'text-[#4ade80]' :
                  a.type === 'mark_blocked' ? 'text-[#fbbf24]' :
                  'text-[#888]'
                }>
                  {a.type === 'remove' ? '✕ Remove' :
                   a.type === 'add' ? '+ Add' :
                   a.type === 'replace' ? '↻ Replace' :
                   a.type === 'mark_blocked' ? '⊘ Block' : '✓ Keep'}
                </span>
                <span className="text-[#888]">
                  {a.newText || allTasks.find(t => t.id === a.taskId)?.text || ''}
                </span>
              </div>
            ))}
          </div>

          <Button
            variant="green"
            size="sm"
            onClick={() => onApply(result.actions)}
          >
            ✓ Apply Changes
          </Button>
        </div>
      )}
    </div>
  )
}