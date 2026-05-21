import { invokeIntegration } from './integrations'
import { supabase } from './supabase'
import { getTopActions } from './priorityEngine'

export async function listCalendarEvents(daysAhead = 14) {
  const timeMin = new Date().toISOString()
  const timeMax = new Date(Date.now() + daysAhead * 86400000).toISOString()
  const data = await invokeIntegration({
    action: 'calendar_list',
    time_min: timeMin,
    time_max: timeMax,
    max_results: 30,
  })
  return data.events || []
}

export async function createFocusBlock({ title, start, end, taskId, projectId }) {
  const data = await invokeIntegration({
    action: 'calendar_create',
    event: {
      title,
      start,
      end,
      description: taskId ? `J·OS task block` : undefined,
    },
  })

  const { data: { user } } = await supabase.auth.getUser()
  if (user && data.event_id) {
    await supabase.from('calendar_blocks').insert({
      user_id: user.id,
      task_id: taskId || null,
      project_id: projectId || null,
      title,
      start_at: start,
      end_at: end,
      gcal_event_id: data.event_id,
      status: 'scheduled',
      metadata: { htmlLink: data.htmlLink },
    })
  }

  return data
}

/** Block 60–90 min for top priority task today (morning slot). */
export async function autoBlockTopTask(projects, tasksByProject, goals = []) {
  const top = getTopActions(projects, tasksByProject, 1, { goals })
  if (!top.length) return null

  const task = top[0].task
  const project = top[0].project
  const start = new Date()
  start.setHours(start.getHours() < 9 ? 9 : start.getHours() + 1, 0, 0, 0)
  const end = new Date(start.getTime() + 75 * 60000)

  return createFocusBlock({
    title: task.text,
    start: start.toISOString(),
    end: end.toISOString(),
    taskId: task.id,
    projectId: project?.id,
  })
}

export function detectConflicts(events, proposedStart, proposedEnd) {
  const s = new Date(proposedStart).getTime()
  const e = new Date(proposedEnd).getTime()
  return (events || []).filter((ev) => {
    const es = new Date(ev.start?.dateTime || ev.start?.date || 0).getTime()
    const ee = new Date(ev.end?.dateTime || ev.end?.date || 0).getTime()
    return s < ee && e > es
  })
}
