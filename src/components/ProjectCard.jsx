import Badge from './ui/Badge'

export default function ProjectCard({ project, taskCount, doneCount, onClick }) {
  const pct = taskCount > 0 ? Math.round((doneCount / taskCount) * 100) : 0

  return (
    <div
      onClick={onClick}
      className="bg-[#111] border border-[#1f1f1f] rounded-md p-4 sm:p-5 cursor-pointer transition-colors hover:border-[#2a2a2a] active:bg-[#181818]"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h3 className="text-[14px] sm:text-[15px] font-semibold tracking-tight truncate">{project.name}</h3>
          {project.notes && (
            <p className="text-[12px] text-[#888] font-light mt-1 line-clamp-2">{project.notes}</p>
          )}
        </div>
        <Badge color="dim" className="ml-3 flex-shrink-0">{project.status}</Badge>
      </div>

      <div className="flex justify-between text-[10px] text-[#444] tracking-[0.08em] mb-1.5">
        <span>{doneCount}/{taskCount} tasks</span>
        <span>{pct}%</span>
      </div>
      <div className="h-px bg-[#1f1f1f] rounded overflow-hidden">
        <div
          className="h-full bg-white transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}