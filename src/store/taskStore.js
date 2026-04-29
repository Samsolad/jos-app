import { create } from 'zustand'
import { supabase } from '../lib/supabase'

const useTaskStore = create((set, get) => ({
  tasks: {},  // keyed by project_id

  fetchTasks: async (projectId) => {
    const { data } = await supabase
      .from('tasks')
      .select('*')
      .eq('project_id', projectId)
      .order('position', { ascending: true })
      .order('created_at', { ascending: true })
    set(s => ({ tasks: { ...s.tasks, [projectId]: data || [] } }))
  },

  addTask: async (projectId, text, dueDate = null) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const current  = get().tasks[projectId] || []
    const position = current.length
    const { data } = await supabase
      .from('tasks')
      .insert({
        project_id: projectId,
        user_id:    user.id,
        text,
        position,
        due_date:   dueDate || null,
      })
      .select()
      .single()
    if (data) {
      set(s => ({
        tasks: {
          ...s.tasks,
          [projectId]: [...(s.tasks[projectId] || []), data],
        }
      }))
    }
    return data
  },

  toggleTask: async (projectId, taskId) => {
    const current = get().tasks[projectId] || []
    const task = current.find(t => t.id === taskId)
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
      set(s => ({
        tasks: {
          ...s.tasks,
          [projectId]: s.tasks[projectId].map(t => t.id === taskId ? data : t),
        }
      }))
    }
    return data
  },

  deleteTask: async (projectId, taskId) => {
    await supabase.from('tasks').delete().eq('id', taskId)
    set(s => ({
      tasks: {
        ...s.tasks,
        [projectId]: (s.tasks[projectId] || []).filter(t => t.id !== taskId),
      }
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
      set(s => ({
        tasks: {
          ...s.tasks,
          [projectId]: s.tasks[projectId].map(t => t.id === taskId ? data : t),
        }
      }))
    }
    return data
  },

  // Bulk replace tasks for a project (used by AI re-planning)
  replaceTasks: async (projectId, newTasks) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    // Delete existing undone tasks
    const current = get().tasks[projectId] || []
    const toDelete = current.filter(t => !t.done).map(t => t.id)
    if (toDelete.length) {
      await supabase.from('tasks').delete().in('id', toDelete)
    }
    // Insert new tasks
    const inserts = newTasks.map((t, i) => ({
      project_id: projectId,
      user_id: user.id,
      text: t.text,
      update_note: t.note || '',
      blocked: t.blocked || false,
      added_by_ai: true,
      position: current.filter(t => t.done).length + i,
    }))
    if (inserts.length) {
      await supabase.from('tasks').insert(inserts)
    }
    await get().fetchTasks(projectId)
  },
}))

export default useTaskStore