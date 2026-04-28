/**
 * NEXT ACTION ENGINE
 * Scores every task across all projects and returns
 * the single most important thing to do right now.
 */

// Score a single task 0-100
export function scoreTask(task, project) {
    let score = 0
  
    // ── URGENCY (0-35 points) ─────────────────────────────────────
    if (task.due_date) {
      const daysLeft = Math.ceil(
        (new Date(task.due_date) - new Date()) / 86400000
      )
      if (daysLeft <= 0)  score += 35  // overdue
      else if (daysLeft === 1) score += 30
      else if (daysLeft <= 3)  score += 25
      else if (daysLeft <= 7)  score += 18
      else if (daysLeft <= 14) score += 10
      else score += 4
    } else {
      score += 8 // no deadline — small base score
    }
  
    // ── BLOCKERS (0-20 points) ────────────────────────────────────
    // Tasks that are blocking other tasks are high priority
    if (task.blocked) {
      score -= 20 // blocked tasks drop in priority
    }
  
    // AI-added tasks from re-planning — slightly higher priority
    if (task.added_by_ai) score += 5
  
    // ── PROJECT STATUS (0-15 points) ─────────────────────────────
    const status = (project?.status || '').toLowerCase()
    if (status === 'critical')   score += 15
    else if (status === 'active') score += 10
    else if (status === 'planning') score += 5
  
    // ── POSITION (0-10 points) ────────────────────────────────────
    // Earlier tasks in a project get slightly higher score
    const position = task.position || 0
    if (position === 0)      score += 10
    else if (position <= 2)  score += 7
    else if (position <= 5)  score += 4
  
    return Math.max(0, Math.min(100, score))
  }
  
  // Get urgency label and colour from score
  export function getUrgency(score) {
    if (score >= 70) return { label: 'Critical',  color: '#ef4444', badge: 'red'   }
    if (score >= 50) return { label: 'High',       color: '#f59e0b', badge: 'amber' }
    if (score >= 30) return { label: 'Medium',     color: '#e8e8e8', badge: 'white' }
    return             { label: 'Low',        color: '#888888', badge: 'dim'   }
  }
  
  // Score all tasks and return the top one
  export function getNextAction(projects) {
    if (!projects || projects.length === 0) return null
  
    const scored = []
  
    projects.forEach(project => {
      const tasks = project.tasks || []
      tasks
        .filter(t => !t.done && !t.blocked)
        .forEach(task => {
          scored.push({
            task,
            project,
            score: scoreTask(task, project),
          })
        })
    })
  
    if (scored.length === 0) return null
  
    // Sort by score descending
    scored.sort((a, b) => b.score - a.score)
    return scored[0]
  }
  
  // Get top N actions
  export function getTopActions(projects, n = 3) {
    if (!projects || projects.length === 0) return []
  
    const scored = []
  
    projects.forEach(project => {
      const tasks = project.tasks || []
      tasks
        .filter(t => !t.done && !t.blocked)
        .forEach(task => {
          scored.push({
            task,
            project,
            score: scoreTask(task, project),
          })
        })
    })
  
    scored.sort((a, b) => b.score - a.score)
    return scored.slice(0, n)
  }