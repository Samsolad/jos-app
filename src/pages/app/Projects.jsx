import { useEffect, useState } from 'react'
import useProjectStore from '../../store/projectStore'
import useTaskStore from '../../store/taskStore'
import ProjectCard from '../../components/ProjectCard'
import TaskItem from '../../components/TaskItem'
import TaskUpdatePanel from '../../components/TaskUpdatePanel'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import Badge from '../../components/ui/Badge'
import useMentorStore from '../../store/mentorStore'
import useAuthStore from '../../store/authStore'
import { getTopActions, partitionTasksByTier } from '../../lib/scoring'
import { taskIsPaid, taskEstimatedCost, isDependencyBlocked } from '../../lib/taskMeta'

export default function Projects() {
  const { projects, loading, fetchProjects, addProject, deleteProject, updateProjectMeta } = useProjectStore()
  const { tasks, fetchTasks, addTask, toggleTask, deleteTask, updateTask } = useTaskStore()

  const [activeId, setActiveId] = useState(null)
  const [showAdd, setShowAdd] = useState(false)
  const [newName, setNewName] = useState('')
  const [newStatus, setNewStatus] = useState('Active')
  const [newNotes, setNewNotes] = useState('')
  const [newTask, setNewTask] = useState('')
  const [newTaskDate, setNewTaskDate] = useState('')
  const [updatingTask, setUpdatingTask] = useState(null)
  const [showLater, setShowLater] = useState(false)
  const [showGhosted, setShowGhosted] = useState(false)

  useEffect(() => { fetchProjects() }, [])

  const activeProject = projects.find(p => p.id === activeId)
  const projectTasks = activeId ? (tasks[activeId] || []) : []
  const doneCount = projectTasks.filter(t => t.done).length
  const { trigger } = useMentorStore()
  const profile = useAuthStore(s => s.profile)

  const handleSelectProject = async (id) => {
    setActiveId(id)
    setUpdatingTask(null)
    await fetchTasks(id)
  }

  const handleAddProject = async () => {
    if (!newName.trim()) return
    const p = await addProject(newName.trim(), newStatus || 'Active', newNotes.trim())
    if (p) {
      setNewName('')
      setNewStatus('Active')
      setNewNotes('')
      setShowAdd(false)
      setActiveId(p.id)
    }
  }

  const handleAddTask = async () => {
    if (!newTask.trim() || !activeId) return
    await addTask(activeId, newTask.trim(), newTaskDate || null)
    setNewTask('')
    setNewTaskDate('')
  }

  const handleApplyAIChanges = async (actions) => {
    if (!activeId) return
    for (const action of actions) {
      if (action.type === 'remove') {
        await deleteTask(activeId, action.taskId)
      } else if (action.type === 'replace') {
        await updateTask(activeId, action.taskId, {
          text: action.newText,
          update_note: action.note || '',
        })
      } else if (action.type === 'mark_blocked') {
        await updateTask(activeId, action.taskId, {
          blocked: true,
          update_note: action.note || '',
        })
      } else if (action.type === 'add') {
        await addTask(activeId, action.newText)
      }
    }
    setUpdatingTask(null)
    await fetchTasks(activeId)
  }

  // ── LIST VIEW ──────────────────────────────────────────────────
  if (!activeProject) {
    return (
      <div className="animate-fadeUp">
        <p className="text-[10px] tracking-[0.2em] uppercase text-[#444] font-medium mb-2">Work</p>
        <h1 className="font-serif text-[24px] sm:text-[26px] font-bold mb-1">
          Projects & <em className="text-[#e8e8e8]">Ventures</em>
        </h1>
        <p className="text-[13px] text-[#888] font-light mb-6">
          {projects.length > 0
            ? `${projects.length} project${projects.length > 1 ? 's' : ''} tracked.`
            : 'Add your first project below.'}
        </p>

        {/* Project cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
          {projects.map(p => {
            const pt = tasks[p.id] || []
            return (
              <ProjectCard
                key={p.id}
                project={p}
                taskCount={pt.length}
                doneCount={pt.filter(t => t.done).length}
                onClick={() => handleSelectProject(p.id)}
              />
            )
          })}
        </div>

        {loading && projects.length === 0 && (
          <div className="flex justify-center py-10">
            <div className="w-5 h-5 border-2 border-[#2a2a2a] border-t-white rounded-full animate-spin" />
          </div>
        )}

        {/* Add project */}
        {!showAdd ? (
          <Button variant="ghost" size="sm" onClick={() => setShowAdd(true)}>
            + New Project
          </Button>
        ) : (
          <div className="bg-[#111] border border-[#1f1f1f] rounded-md p-4 sm:p-5 mt-2 animate-fadeUp">
            <p className="text-[10px] tracking-[0.16em] uppercase text-[#444] font-medium mb-4">New Project</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-3">
              <Input
                label="Project Name"
                placeholder="What are you building?"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && handleAddProject()}
              />
              <Input
                label="Status"
                placeholder="e.g. Active, Planning, Marketing…"
                value={newStatus}
                onChange={e => setNewStatus(e.target.value)}
              />
            </div>
            <Input
              label="Notes (optional)"
              type="textarea"
              placeholder="Brief description…"
              value={newNotes}
              onChange={e => setNewNotes(e.target.value)}
            />
            <div className="flex gap-2 mt-1">
              <Button variant="solid" size="sm" onClick={handleAddProject}>+ Add Project</Button>
              <Button variant="muted" size="xs" onClick={() => setShowAdd(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </div>
    )
  }

  // ── DETAIL VIEW ────────────────────────────────────────────────
  const pct = projectTasks.length > 0 ? Math.round((doneCount / projectTasks.length) * 100) : 0
  const { active, later, ghosted, paused, blocked } = partitionTasksByTier(
    projectTasks,
    projectTasks,
  )
  const projectsWithTasks = projects.map((p) => ({
    ...p,
    tasks: p.id === activeId ? projectTasks : tasks[p.id] || [],
  }))
  const topNow = getTopActions(projectsWithTasks, { [activeId]: projectTasks }, 3).filter(
    (x) => x.project.id === activeId,
  )

  const renderTask = (t) => (
    <div key={t.id}>
      <TaskItem
        task={t}
        blockedByDep={isDependencyBlocked(t, projectTasks)}
        onToggle={async () => {
          await toggleTask(activeId, t.id)
          const updated = tasks[activeId] || []
          const justDone = updated.find((tk) => tk.id === t.id)
          if (justDone && !t.done) {
            const next = updated.find((tk) => !tk.done && !tk.blocked && tk.id !== t.id)
            if (next) {
              await trigger(
                'next_task',
                { task: next.text, project: activeProject?.name || '' },
                profile,
              )
            } else {
              await trigger('celebrate', { item: `all tasks in ${activeProject?.name}` }, profile)
            }
          }
        }}
        onUpdate={() => setUpdatingTask(updatingTask === t.id ? null : t.id)}
        onDelete={() => deleteTask(activeId, t.id)}
      />
      {updatingTask === t.id && (
        <TaskUpdatePanel
          task={t}
          allTasks={projectTasks}
          projectName={activeProject.name}
          onApply={handleApplyAIChanges}
          onCancel={() => setUpdatingTask(null)}
        />
      )}
    </div>
  )

  return (
    <div className="animate-fadeUp">
      {/* Back */}
      <button
        onClick={() => { setActiveId(null); setUpdatingTask(null) }}
        className="text-[11px] text-[#444] hover:text-[#888] transition-colors mb-4 inline-flex items-center gap-1"
      >
        ← All Projects
      </button>

      {/* Project header */}
      <div className="bg-[#111] border border-[#1f1f1f] rounded-md p-4 sm:p-5 mb-5">
        <div className="flex items-start justify-between mb-3 gap-3">
          <div className="flex-1 min-w-0">
            <h2 className="text-[18px] sm:text-[20px] font-bold tracking-tight">{activeProject.name}</h2>
            {activeProject.notes && (
              <p className="text-[12px] text-[#888] font-light mt-1 leading-relaxed">{activeProject.notes}</p>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Badge color="dim">{activeProject.status}</Badge>
            <Button
              variant="red"
              size="xs"
              onClick={async () => {
                if (confirm('Delete this project and all its tasks?')) {
                  await deleteProject(activeId)
                  setActiveId(null)
                }
              }}
            >
              Delete
            </Button>
          </div>
        </div>

        {/* Progress */}
        <div className="flex justify-between text-[10px] text-[#444] tracking-[0.08em] mb-1.5">
          <span>{doneCount}/{projectTasks.length} tasks</span>
          <span>{pct}%</span>
        </div>
        <div className="h-px bg-[#1f1f1f] rounded overflow-hidden">
          <div
            className="h-full bg-white transition-all duration-500 ease-out"
            style={{ width: `${pct}%` }}
          />
        </div>

        <div className="mt-4 pt-4 border-t border-[#1f1f1f]">
          <p className="text-[10px] tracking-[0.16em] uppercase text-[#444] font-medium mb-2">
            Priority engine
          </p>
          <div className="flex flex-wrap items-center gap-4">
            <label className="flex items-center gap-2 text-[12px] text-[#888]">
              Weight (1–10)
              <input
                type="range"
                min="1"
                max="10"
                value={activeProject.meta?.priority_weight ?? 5}
                onChange={async (e) => {
                  await updateProjectMeta(activeId, { priority_weight: Number(e.target.value) })
                }}
                className="w-24"
              />
              <span className="text-white w-4">{activeProject.meta?.priority_weight ?? 5}</span>
            </label>
            <label className="flex items-center gap-2 text-[12px] text-[#888] cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(activeProject.meta?.is_revenue_critical)}
                onChange={async (e) => {
                  await updateProjectMeta(activeId, { is_revenue_critical: e.target.checked })
                }}
                className="rounded"
              />
              Revenue-critical venture
            </label>
          </div>
        </div>
      </div>

      <p className="text-[10px] tracking-[0.2em] uppercase text-[#444] font-medium mb-1">
        Now — top {Math.min(3, topNow.length || active.length)} actions
      </p>
      <p className="text-[11px] text-[#444] font-light mb-3">
        Paid burn (pending):{' '}
        <span className="text-[#ef4444]">
          £{projectTasks.filter((t) => !t.done && taskIsPaid(t)).reduce((s, t) => s + taskEstimatedCost(t), 0)}
        </span>
      </p>

      {projectTasks.length === 0 && (
        <p className="text-[13px] text-[#444] font-light mb-4">No tasks yet. Use Navigator on the hub or add below.</p>
      )}

      {(topNow.length ? topNow.map((x) => x.task) : active.slice(0, 3)).map(renderTask)}

      {blocked.length > 0 && (
        <>
          <p className="text-[10px] tracking-[0.16em] uppercase text-[#fbbf24] mt-4 mb-2">Waiting on dependency</p>
          {blocked.map(renderTask)}
        </>
      )}

      {later.length > 0 && (
        <>
          <button type="button" onClick={() => setShowLater(!showLater)} className="text-[10px] tracking-[0.16em] uppercase text-[#444] mt-4 mb-2 hover:text-[#888]">
            Later ({later.length}) {showLater ? '▾' : '▸'}
          </button>
          {showLater && later.map(renderTask)}
        </>
      )}

      {ghosted.length > 0 && (
        <>
          <button type="button" onClick={() => setShowGhosted(!showGhosted)} className="text-[10px] tracking-[0.16em] uppercase text-[#333] mt-2 mb-2 hover:text-[#666]">
            Ghosted ({ghosted.length}) {showGhosted ? '▾' : '▸'}
          </button>
          {showGhosted && ghosted.map(renderTask)}
        </>
      )}

      {paused.length > 0 && (
        <p className="text-[11px] text-[#444] mt-3 italic">{paused.length} task(s) paused (crisis pivot)</p>
      )}

      {/* Add task */}
      <div className="mt-4">
        <div className="flex gap-2 mb-2">
          <input
            className="flex-1 bg-[#111] border border-[#2a2a2a] rounded py-2.5 px-4 text-white text-[13px] font-light outline-none focus:border-[#333] placeholder:text-[#444]"
            placeholder="Add task…"
            value={newTask}
            onChange={e => setNewTask(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAddTask()}
          />
          <input
            type="date"
            className="bg-[#111] border border-[#2a2a2a] rounded py-2.5 px-3 text-[#888] text-[13px] font-light outline-none focus:border-[#333] w-[140px]"
            value={newTaskDate}
            onChange={e => setNewTaskDate(e.target.value)}
          />
        </div>
        <Button variant="ghost" size="sm" onClick={handleAddTask}>+ Add Task</Button>
      </div>
    </div>
  )
}