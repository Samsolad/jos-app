import { NavLink } from 'react-router-dom'
import useProjectStore from '../../store/projectStore'
import useGoalStore from '../../store/goalStore'
import { tierLabel, getTier } from '../../lib/subscription'
import { AUTH_LABELS, getAuthorityLevel } from '../../lib/authority'

export default function ConversationSidebar({
  open,
  onClose,
  profile,
  messageCount,
  personality,
  onPersonalityChange,
}) {
  const { projects } = useProjectStore()
  const { goals } = useGoalStore()
  const activeGoals = goals.filter((g) => !g.done).slice(0, 5)
  const activeProjects = projects.filter((p) => p.status !== 'archived').slice(0, 5)

  return (
    <>
      {open && (
        <button
          type="button"
          className="fixed inset-0 bg-black/40 z-40 lg:hidden"
          onClick={onClose}
          aria-label="Close sidebar"
        />
      )}
      <aside
        className={`ai-sidebar fixed lg:static inset-y-0 right-0 z-50 w-[min(100%,320px)] lg:w-[280px] flex-shrink-0 border-l border-jos-border bg-jos-surface flex flex-col ${
          open ? 'translate-x-0' : 'translate-x-full lg:translate-x-0'
        }`}
        aria-label="Conversation context"
      >
        <div className="flex items-center justify-between p-4 border-b border-jos-border">
          <p className="jos-label">Context</p>
          <button
            type="button"
            onClick={onClose}
            className="lg:hidden text-jos-muted hover:text-jos-text text-sm"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-5">
          <section>
            <p className="text-[11px] text-jos-accent font-medium mb-1">
              Remembering {Math.min(messageCount, 12)} recent messages
            </p>
            <p className="text-[12px] text-jos-muted leading-relaxed">
              {profile?.name?.split(' ')[0] || 'You'} · {tierLabel(getTier(profile))} ·{' '}
              {AUTH_LABELS[getAuthorityLevel(profile)] || 'Suggest'}
            </p>
          </section>

          <section>
            <p className="jos-label mb-2">AI personality</p>
            <div className="flex flex-wrap gap-1.5">
              {['professional', 'friendly', 'concise'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => onPersonalityChange?.(p)}
                  className={`px-2.5 py-1 rounded-full text-[11px] capitalize border transition-colors ${
                    personality === p
                      ? 'border-jos-violet bg-jos-violet/10 text-jos-text'
                      : 'border-jos-border text-jos-muted hover:border-jos-accent'
                  }`}
                >
                  {p}
                </button>
              ))}
            </div>
          </section>

          {activeProjects.length > 0 && (
            <section>
              <p className="jos-label mb-2">Active projects</p>
              <ul className="space-y-1.5">
                {activeProjects.map((p) => (
                  <li key={p.id}>
                    <NavLink
                      to="/projects"
                      className="text-[13px] text-jos-muted hover:text-jos-text block truncate"
                    >
                      {p.name}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {activeGoals.length > 0 && (
            <section>
              <p className="jos-label mb-2">Goals</p>
              <ul className="space-y-1.5">
                {activeGoals.map((g) => (
                  <li key={g.id}>
                    <NavLink
                      to="/goals"
                      className="text-[13px] text-jos-muted hover:text-jos-text block truncate"
                    >
                      {g.text}
                    </NavLink>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-lg border border-jos-border/80 p-3 bg-jos-bg/50">
            <p className="jos-label mb-1">Privacy</p>
            <p className="text-[11px] text-jos-muted leading-relaxed">
              Memory uses your About section and chat context. You control what is saved in Profile.
            </p>
          </section>
        </div>
      </aside>
    </>
  )
}
