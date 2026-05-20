/**
 * 6-factor Priority Engine — explainable task scoring for J·OS Phase 2.
 * Factors: time, revenue, alignment, readiness, cost, behaviour
 */
import {
  getTaskMeta,
  taskTier,
  taskEstimatedCost,
  taskIsPaid,
  isDependencyBlocked,
  TIERS,
} from './taskMeta'
import { getBehaviourBoost } from './behaviour'

export const FACTOR_KEYS = ['time', 'revenue', 'alignment', 'readiness', 'cost', 'behaviour']

export const FACTOR_WEIGHTS = {
  time: 0.25,
  revenue: 0.2,
  alignment: 0.15,
  readiness: 0.2,
  cost: 0.1,
  behaviour: 0.1,
}

export const FACTOR_LABELS = {
  time: 'Time urgency',
  revenue: 'Revenue impact',
  alignment: 'Strategic alignment',
  readiness: 'Execution readiness',
  cost: 'Lean discipline',
  behaviour: 'Momentum',
}

function projectMeta(project) {
  return project?.meta && typeof project.meta === 'object' ? project.meta : {}
}

function scoreTime(task) {
  if (task.due_date) {
    const daysLeft = Math.ceil((new Date(task.due_date) - new Date()) / 86400000)
    if (daysLeft <= 0) return 100
    if (daysLeft === 1) return 90
    if (daysLeft <= 3) return 75
    if (daysLeft <= 7) return 55
    if (daysLeft <= 14) return 35
    return 18
  }
  return 25
}

function scoreRevenue(project) {
  const meta = projectMeta(project)
  let s = Math.min(60, (Number(meta.priority_weight) || 5) * 6)
  if (meta.is_revenue_critical) s += 30
  const status = (project?.status || '').toLowerCase()
  if (status === 'critical') s += 10
  else if (status === 'active') s += 6
  return Math.min(100, s)
}

function scoreAlignment(task, project, goals = []) {
  let s = 40
  const status = (project?.status || '').toLowerCase()
  if (status === 'critical') s += 25
  const text = (task.text || '').toLowerCase()
  for (const g of goals.filter((x) => !x.done)) {
    if (!g.text) continue
    const gText = g.text.toLowerCase()
    if (text.includes(gText.slice(0, 12)) || gText.includes(text.slice(0, 12))) {
      s += 20
      if (g.deadline) {
        const dl = Math.ceil((new Date(g.deadline) - new Date()) / 86400000)
        if (dl <= 7) s += 15
        else if (dl <= 14) s += 8
      }
    }
  }
  if (task.added_by_ai) s += 5
  return Math.min(100, s)
}

function scoreReadiness(task, allTasks) {
  if (task.blocked) return 10
  if (isDependencyBlocked(task, allTasks)) return 0
  const depId = getTaskMeta(task).depends_on_task_id
  if (depId) {
    const dep = allTasks.find((t) => t.id === depId)
    if (dep?.done) return 85
    return 15
  }
  return 80
}

function scoreCost(task) {
  if (!taskIsPaid(task)) return 85
  const cost = taskEstimatedCost(task)
  if (cost <= 0) return 70
  if (cost <= 50) return 55
  if (cost <= 200) return 40
  return 20
}

function scoreBehaviourFactor(taskId) {
  return 50 + getBehaviourBoost(taskId)
}

function projectWeight(project) {
  return scoreRevenue(project) / 5
}

export function scoreTaskWithBreakdown(task, project, allTasksInProject = [], context = {}) {
  const goals = context.goals || []

  if (task.done || taskTier(task) === TIERS.PAUSED) {
    return { score: 0, factors: Object.fromEntries(FACTOR_KEYS.map((k) => [k, 0])), blocked: true }
  }
  if (taskTier(task) === TIERS.GHOSTED) {
    return { score: 0, factors: Object.fromEntries(FACTOR_KEYS.map((k) => [k, 0])), blocked: true }
  }
  if (isDependencyBlocked(task, allTasksInProject)) {
    return {
      score: 0,
      factors: { time: 0, revenue: 0, alignment: 0, readiness: 0, cost: 0, behaviour: 0 },
      blocked: true,
    }
  }

  const factors = {
    time: scoreTime(task),
    revenue: scoreRevenue(project),
    alignment: scoreAlignment(task, project, goals),
    readiness: scoreReadiness(task, allTasksInProject),
    cost: scoreCost(task),
    behaviour: scoreBehaviourFactor(task.id),
  }

  let score = 0
  for (const key of FACTOR_KEYS) {
    score += factors[key] * FACTOR_WEIGHTS[key]
  }

  const tier = taskTier(task)
  if (tier === TIERS.LATER) score -= 22
  if (tier === TIERS.ACTIVE) score += 6

  const position = task.position || 0
  if (position === 0) score += 6
  else if (position <= 2) score += 3

  score = Math.max(0, Math.min(100, Math.round(score)))

  return { score, factors, blocked: false }
}

/** Back-compat wrapper used across the app */
export function scoreTask(task, project, allTasksInProject = [], context = {}) {
  return scoreTaskWithBreakdown(task, project, allTasksInProject, context).score
}

export function getUrgency(score) {
  if (score >= 70) return { label: 'Critical', color: '#ef4444', badge: 'red' }
  if (score >= 50) return { label: 'High', color: '#f59e0b', badge: 'amber' }
  if (score >= 30) return { label: 'Medium', color: '#e8e8e8', badge: 'white' }
  return { label: 'Low', color: '#888888', badge: 'dim' }
}

function scoreAllProjects(projects, tasksByProject, context = {}) {
  const scored = []
  projects.forEach((project) => {
    const tasks = tasksByProject[project.id] || []
    tasks
      .filter((t) => !t.done && taskTier(t) !== TIERS.GHOSTED && taskTier(t) !== TIERS.PAUSED)
      .forEach((task) => {
        const breakdown = scoreTaskWithBreakdown(task, project, tasks, context)
        scored.push({
          task,
          project,
          score: breakdown.score,
          factors: breakdown.factors,
          tier: taskTier(task),
          blockedByDep: isDependencyBlocked(task, tasks),
        })
      })
  })
  scored.sort((a, b) => b.score - a.score)
  return scored
}

export function getNextAction(projects, tasksByProject = {}, context = {}) {
  const map =
    tasksByProject && Object.keys(tasksByProject).length
      ? tasksByProject
      : Object.fromEntries(projects.map((p) => [p.id, p.tasks || []]))
  const scored = scoreAllProjects(projects, map, context)
  return scored[0] || null
}

export function getTopActions(projects, tasksByProject = {}, n = 3, context = {}) {
  const map =
    tasksByProject && Object.keys(tasksByProject).length
      ? tasksByProject
      : Object.fromEntries(projects.map((p) => [p.id, p.tasks || []]))
  return scoreAllProjects(projects, map, context).slice(0, n)
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

export function applyTierToLowScoring(projects, tasksByProject, keepActive = 3, context = {}) {
  const scored = scoreAllProjects(projects, tasksByProject, context)
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

export { projectWeight }
