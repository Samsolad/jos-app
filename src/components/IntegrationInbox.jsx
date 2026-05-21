import useIntegrationStore from '../store/integrationStore'
import useProjectStore from '../store/projectStore'
import useTaskStore from '../store/taskStore'
import Button from './ui/Button'

export default function IntegrationInbox() {
  const { inbox, dismissInboxItem, applyInboxItem } = useIntegrationStore()
  const { projects } = useProjectStore()
  const addTask = useTaskStore((s) => s.addTask)

  if (!inbox.length) {
    return (
      <p className="text-[12px] text-jos-muted font-light">
        No pending items. Sync Gmail or paste a WhatsApp thread to extract commitments.
      </p>
    )
  }

  const handleApply = async (item) => {
    const project = projects.find((p) => p.status === 'active') || projects[0]
    if (project) {
      await addTask(project.id, item.title, item.due_at?.split('T')[0] || null)
    }
    await applyInboxItem(item.id)
  }

  return (
    <div className="space-y-2">
      {inbox.map((item) => (
        <div
          key={item.id}
          className="jos-card p-3 flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4"
        >
          <div className="flex-1 min-w-0">
            <p className="text-[10px] uppercase tracking-wider text-jos-muted mb-0.5">
              {item.provider}
            </p>
            <p className="text-sm text-jos-text font-medium truncate">{item.title}</p>
            {item.due_at && (
              <p className="text-[11px] text-jos-muted mt-0.5">
                Due {new Date(item.due_at).toLocaleString()}
              </p>
            )}
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <Button variant="ghost" size="sm" onClick={() => dismissInboxItem(item.id)}>
              Dismiss
            </Button>
            <Button size="sm" onClick={() => handleApply(item)} disabled={!projects.length}>
              → Task
            </Button>
          </div>
        </div>
      ))}
    </div>
  )
}
