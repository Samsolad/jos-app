import {
  getTaskMeta,
  taskTier,
  taskEstimatedCost,
  taskIsPaid,
  isDependencyBlocked,
  TIERS,
} from './taskMeta'

function projectWeight(project) {
  const meta = project?.meta && typeof project.meta === 'object' ? project.meta : {}
  let w = Number(meta.priority_weight) || 5
  if (meta.is_revenue_critical) w += 15
  const status = (project?.status || '').toLowerCase()
  if (status === 'critical') w += 12
  else if (status === 'active') w += 8
  else if (status === 'planning') w += 3
  return w
}

export function scoreTask(task, project, allTasksInProject = []) {
  if (task.done || taskTier(task) === TIERS.PAUSED) return 0
  if (taskTier(task) === TIERS.GHOSTED) return 0
  if (isDependencyBlocked(task, allTasksInProject)) return 0

  let score = 0

  if (task.due_date) {
    const daysLeft = Math.ceil((new Date(task.due_date) - new Date()) / 86400000)
    if (daysLeft <= 0) score += 35
    else if (daysLeft === 1) score += 30
    else if (daysLeft <= 3) score += 25
    else if (daysLeft <= 7) score += 18
    else if (daysLeft <= 14) score += 10
    else score += 4
  } else {
    score += 6
  }

  if (task.blocked) score -= 25
  if (task.added_by_ai) score += 4
  if (taskIsPaid(task) && taskEstimatedCost(task) > 0) score += 3

  score += Math.min(20, projectWeight(project))

  const tier = taskTier(task)
  if (tier === TIERS.LATER) score -= 30
  if (tier === TIERS.ACTIVE) score += 5

  const position = task.position || 0
  if (position === 0) score += 8
  else if (position <= 2) score += 5

  return Math.max(0, Math.min(100, score))
}

export function getUrgency(score) {
  if (score >= 70) return { label: 'Critical', color: '#ef4444', badge: 'red' }
  if (score >= 50) return { label: 'High', color: '#f59e0b', badge: 'amber' }
  if (score >= 30) return { label: 'Medium', color: '#e8e8e8', badge: 'white' }
  return { label: 'Low', color: '#888888', badge: 'dim' }
}

function scoreAllProjects(projects, tasksByProject) {
  const scored = []
  projects.forEach((project) => {
    const tasks = tasksByProject[project.id] || []
    tasks
      .filter((t) => !t.done && taskTier(t) !== TIERS.GHOSTED && taskTier(t) !== TIERS.PAUSED)
      .forEach((task) => {
        scored.push({
          task,
          project,
          score: scoreTask(task, project, tasks),
          tier: taskTier(task),
          blockedByDep: isDependencyBlocked(task, tasks),
        })
      })
  })
  scored.sort((a, b) => b.score - a.score)
  return scored
}

export function getNextAction(projects, tasksByProject = {}) {
  const map =
    tasksByProject && Object.keys(tasksByProject).length
      ? tasksByProject
      : Object.fromEntries(projects.map((p) => [p.id, p.tasks || []]))
  const scored = scoreAllProjects(projects, map)
  return scored[0] || null
}

export function getTopActions(projects, tasksByProject = {}, n = 3) {
  const map =
    tasksByProject && Object.keys(tasksByProject).length
      ? tasksByProject
      : Object.fromEntries(projects.map((p) => [p.id, p.tasks || []]))
  return scoreAllProjects(projects, map).slice(0, n)
}

export function partitionTasksByTier(tasks, allTasks) {
  const active = []
  const later = []
  const ghosted = []
  const paused = []
  const blocked = []

  for (const t of tasks) {
    if (t.done) continue
    const tier = taskTier(t)
    if (isDependencyBlocked(t, allTasks)) {
      blocked.push(t)
      continue
    }
    if (tier === TIERS.PAUSED) paused.push(t)
    else if (tier === TIERS.GHOSTED) ghosted.push(t)
    else if (tier === TIERS.LATER) later.push(t)
    else active.push(t)
  }

  return { active, later, ghosted, paused, blocked }
}

export function applyTierToLowScoring(projects, tasksByProject, keepActive = 3) {
  const scored = scoreAllProjects(projects, tasksByProject)
  const updates = []
  scored.forEach((item, idx) => {
    if (idx < keepActive) return
    if (item.score < 25 && taskTier(item.task) === TIERS.ACTIVE) {
      updates.push({ projectId: item.project.id, taskId: item.task.id, tier: TIERS.LATER })
    } else if (idx >= 8 && taskTier(item.task) === TIERS.ACTIVE) {
      updates.push({ projectId: item.project.id, taskId: item.task.id, tier: TIERS.GHOSTED })
    }
  })
  return updates
}
