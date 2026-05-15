/** Navigator fields stored in Supabase `meta` jsonb (no schema break if column missing). */

export const TIERS = {
  ACTIVE: 'active',
  LATER: 'later',
  GHOSTED: 'ghosted',
  PAUSED: 'paused',
}

export function getTaskMeta(task) {
  return task?.meta && typeof task.meta === 'object' ? task.meta : {}
}

export function withTaskMeta(task, patch) {
  return { ...task, meta: { ...getTaskMeta(task), ...patch } }
}

export function taskTier(task) {
  return getTaskMeta(task).tier || TIERS.ACTIVE
}

export function taskDependsOn(task) {
  return getTaskMeta(task).depends_on_task_id || null
}

export function taskEstimatedCost(task) {
  const n = Number(getTaskMeta(task).estimated_cost)
  return Number.isFinite(n) ? n : 0
}

export function taskIsPaid(task) {
  return Boolean(getTaskMeta(task).is_paid)
}

export function isDependencyBlocked(task, allTasks) {
  const depId = taskDependsOn(task)
  if (!depId) return false
  const dep = allTasks.find((t) => t.id === depId)
  return dep ? !dep.done : false
}

export function parseCostFromBudget(budgetStr) {
  if (!budgetStr || typeof budgetStr !== 'string') return 0
  const m = budgetStr.replace(/,/g, '').match(/[\d.]+/)
  return m ? parseFloat(m[0]) : 0
}

export function sumBurnForecast(steps) {
  return (steps || []).reduce((sum, s) => {
    const cost = s.estimated_cost ?? parseCostFromBudget(s.budget)
    return sum + (s.is_paid ? cost : 0)
  }, 0)
}
