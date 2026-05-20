import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { markTaskActivityToday } from '../lib/activity'
import { trackEvent, EVENT_TYPES } from '../lib/behaviour'
import { getTaskMeta, TIERS } from '../lib/taskMeta'

const useTaskStore = create((set, get) => ({
  tasks: {},

  fetchTasks: async (projectId) => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true })
    set((s) => ({ tasks: { ...s.tasks, [projectId]: data || [] } }))
  },

  fetchAllTasks: async (projectIds) => {
    for (const id of projectIds) {
      await get().fetchTasks(id)
    }
  },

  addTask: async (projectId, text, dueDate = null, meta = {}) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const current = get().tasks[projectId] || []
    const position = current.length
    const row = {
      project_id: projectId,
      user_id: user.id,
      text,
      position,
      due_date: dueDate || null,
      meta: { tier: TIERS.ACTIVE, ...meta },
    }
    let { data, error } = await supabase.from('tasks').insert(row).select().single()
    if (error?.message?.includes('meta')) {
      const { data: d2, error: e2 } = await supabase
        .from('tasks')
        .insert({
          project_id: projectId,
          user_id: user.id,
          text,
          position,
          due_date: dueDate || null,
        })
        .select()
        .single()
      data = d2
      error = e2
    }
    if (error || !data) {
      console.warn('[tasks] insert failed:', error?.message)
      return null
    }
    set((s) => ({
      tasks: {
        ...s.tasks,
        [projectId]: [...(s.tasks[projectId] || []), data],
      },
    }))
    return data
  },

  toggleTask: async (projectId, taskId) => {
    const current = get().tasks[projectId] || []
    const task = current.find((t) => t.id === taskId)
    if (!task) return
    const newDone = !task.done
    const updates = { done: newDone }
    if (task.blocked && newDone) updates.blocked = false
    const { data } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .select()
      .single()
    if (data) {
      if (newDone) {
        markTaskActivityToday()
        trackEvent(EVENT_TYPES.TASK_COMPLETED, {
          taskId,
          entityType: 'task',
          projectId,
        })
      }
      set((s) => ({
        tasks: {
          ...s.tasks,
          [projectId]: s.tasks[projectId].map((t) => (t.id === taskId ? data : t)),
        },
      }))
    }
    return data
  },

  deleteTask: async (projectId, taskId) => {
    await supabase.from('tasks').delete().eq('id', taskId)
    set((s) => ({
      tasks: {
        ...s.tasks,
        [projectId]: (s.tasks[projectId] || []).filter((t) => t.id !== taskId),
      },
    }))
  },

  updateTask: async (projectId, taskId, updates) => {
    const { data } = await supabase
      .from('tasks')
      .update(updates)
      .eq('id', taskId)
      .select()
      .single()
    if (data) {
      set((s) => ({
        tasks: {
          ...s.tasks,
          [projectId]: s.tasks[projectId].map((t) => (t.id === taskId ? data : t)),
        },
      }))
    }
    return data
  },

  updateTaskMeta: async (projectId, taskId, metaPatch) => {
    const current = get().tasks[projectId] || []
    const task = current.find((t) => t.id === taskId)
    if (!task) return null
    const meta = { ...getTaskMeta(task), ...metaPatch }
    return get().updateTask(projectId, taskId, { meta })
  },

  /** Crisis pivot: pause non-focus projects, boost focus tasks to active tier #1 */
  applyPivot: async (projects, focusProjectId, crisisTaskText) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    for (const p of projects) {
      const tasks = get().tasks[p.id] || []
      for (const t of tasks) {
        if (t.done) continue
        const tier =
          p.id === focusProjectId ? TIERS.ACTIVE : TIERS.PAUSED
        await get().updateTaskMeta(p.id, t.id, { tier })
      }
    }

    if (focusProjectId && crisisTaskText) {
      await get().addTask(focusProjectId, crisisTaskText, null, {
        tier: TIERS.ACTIVE,
        is_paid: false,
        estimated_cost: 0,
      })
    }
  },

  replaceTasks: async (projectId, newTasks) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const current = get().tasks[projectId] || []
    const toDelete = current.filter((t) => !t.done).map((t) => t.id)
    if (toDelete.length) {
      await supabase.from('tasks').delete().in('id', toDelete)
    }
    const doneCount = current.filter((task) => task.done).length
    const inserts = newTasks.map((t, i) => ({
      project_id: projectId,
      user_id: user.id,
      text: t.text,
      update_note: t.note || '',
      blocked: t.blocked || false,
      added_by_ai: true,
      position: doneCount + i,
      meta: t.meta || { tier: TIERS.ACTIVE },
    }))
    if (inserts.length) {
      const { error } = await supabase.from('tasks').insert(inserts)
      if (error?.message?.includes('meta')) {
        await supabase.from('tasks').insert(
          inserts.map(({ meta, ...rest }) => rest),
        )
      }
    }
    await get().fetchTasks(projectId)
  },
}))

export default useTaskStore
