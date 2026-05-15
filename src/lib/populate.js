import { TIERS } from './taskMeta'

/**
 * Inject approved goal steps into a project's task list with dependency chain.
 */
export async function populateGoalToProject(steps, projectId, addTaskFn) {
  const taskIds = []

  for (let i = 0; i < steps.length; i++) {
    const s = steps[i]
    const depIdx = s.depends_on_index
    const dependsOn =
      depIdx != null && depIdx >= 0 && depIdx < taskIds.length
        ? taskIds[depIdx]
        : i > 0
          ? taskIds[i - 1]
          : null

    const meta = {
      tier: i < 3 ? TIERS.ACTIVE : TIERS.LATER,
      estimated_cost: s.estimated_cost ?? 0,
      is_paid: Boolean(s.is_paid),
      lean_alternative: s.lean_alternative || '',
      depends_on_task_id: dependsOn,
      goal_step_index: i,
    }

    const task = await addTaskFn(projectId, s.text, s.due_date || null, meta)
    if (!task) {
      return {
        taskIds,
        error: 'Failed to create task. Run supabase/migrations/001_navigator.sql in Supabase SQL Editor.',
      }
    }
    taskIds.push(task.id)
  }

  return { taskIds }
}
