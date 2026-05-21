import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import useAuthStore from '../../store/authStore'
import useIntegrationStore from '../../store/integrationStore'
import useProjectStore from '../../store/projectStore'
import useTaskStore from '../../store/taskStore'
import useGoalStore from '../../store/goalStore'
import useTeamStore from '../../store/teamStore'
import { PROVIDERS, isGoogleConnected } from '../../lib/integrations'
import { canUseIntegrations, getTier, tierLabel } from '../../lib/subscription'
import IntegrationInbox from '../../components/IntegrationInbox'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'

export default function Integrations() {
  const profile = useAuthStore((s) => s.profile)
  const {
    status,
    loading,
    error,
    emails,
    calendarEvents,
    loadStatus,
    connectGoogle,
    disconnect,
    syncGmailInbox,
    syncCalendar,
    blockTopPriority,
    importWhatsApp,
    saveSocialToken,
    fetchInbox,
  } = useIntegrationStore()
  const { projects } = useProjectStore()
  const { tasks } = useTaskStore()
  const { goals } = useGoalStore()
  const { team, members, fetchTeam, createTeam, inviteMember, canUseTeam } = useTeamStore()

  const [whatsappPaste, setWhatsappPaste] = useState('')
  const [linkedInToken, setLinkedInToken] = useState('')
  const [teamName, setTeamName] = useState('')
  const [inviteEmail, setInviteEmail] = useState('')
  const [blockResult, setBlockResult] = useState(null)

  const allowed = canUseIntegrations(profile)
  const googleOn = isGoogleConnected(status)

  useEffect(() => {
    if (allowed) {
      loadStatus()
      fetchInbox()
      if (canUseTeam(profile)) fetchTeam()
    }
  }, [allowed, profile?.id])

  if (!allowed) {
    return (
      <div className="animate-fadeUp max-w-xl">
        <p className="jos-label mb-2">Integrations</p>
        <h1 className="font-display text-[24px] font-bold mb-4">
          Communication <span className="jos-gradient-text">Engine</span>
        </h1>
        <div className="jos-card p-5">
          <p className="text-sm text-jos-muted mb-4">
            Gmail, Calendar, and WhatsApp extraction are available on Personal tier and above.
            You&apos;re on <strong className="text-jos-text">{tierLabel(getTier(profile))}</strong>.
          </p>
          <Link to="/profile" className="text-jos-accent text-sm hover:underline">
            View plan →
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="animate-fadeUp max-w-2xl">
      <p className="jos-label mb-2">Phase 3</p>
      <h1 className="font-display text-[24px] sm:text-[26px] font-bold mb-2">
        <span className="jos-gradient-text">Integrations</span>
      </h1>
      <p className="text-[13px] text-jos-muted mb-6 font-light">
        Connect Gmail &amp; Calendar, extract WhatsApp actions, queue social posts, and manage your team.
      </p>

      {error && (
        <p className="text-jos-error text-xs mb-4 p-3 rounded-lg border border-jos-error/30 bg-jos-error/5">
          {error}
          {error.includes('not_configured') && (
            <span className="block mt-1 text-jos-muted">
              Add GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Supabase Edge Function secrets (see DEPLOY.md).
            </span>
          )}
        </p>
      )}

      {/* Google */}
      <section className="jos-card p-5 mb-4">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <p className="jos-label mb-1">{PROVIDERS.google.label}</p>
            <p className="text-[12px] text-jos-muted">{PROVIDERS.google.description}</p>
          </div>
          <span
            className={`text-[10px] px-2 py-0.5 rounded-full border ${
              googleOn
                ? 'border-jos-success/40 text-jos-success'
                : 'border-jos-border text-jos-muted'
            }`}
          >
            {googleOn ? 'Connected' : 'Not connected'}
          </span>
        </div>
        <div className="flex flex-wrap gap-2">
          {googleOn ? (
            <>
              <Button size="sm" variant="ghost" onClick={() => syncGmailInbox()} disabled={loading}>
                Scan inbox
              </Button>
              <Button size="sm" variant="ghost" onClick={() => syncCalendar()} disabled={loading}>
                Load calendar
              </Button>
              <Button
                size="sm"
                onClick={async () => {
                  try {
                    const r = await blockTopPriority(projects, tasks, goals)
                    setBlockResult(r?.event_id ? 'Focus block added to Google Calendar' : 'No top task to block')
                  } catch { /* error in store */ }
                }}
                disabled={loading}
              >
                Block top task
              </Button>
              <Button size="sm" variant="ghost" onClick={() => disconnect('google')} disabled={loading}>
                Disconnect
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => connectGoogle()} disabled={loading}>
              Connect Google
            </Button>
          )}
        </div>
        {blockResult && (
          <p className="text-[11px] text-jos-success mt-2">{blockResult}</p>
        )}
        {emails.length > 0 && (
          <p className="text-[11px] text-jos-muted mt-3">
            Last scan: {emails.length} messages
          </p>
        )}
        {calendarEvents.length > 0 && (
          <ul className="mt-3 space-y-1 max-h-32 overflow-y-auto">
            {calendarEvents.slice(0, 5).map((ev) => (
              <li key={ev.id} className="text-[11px] text-jos-muted truncate">
                {ev.title} — {ev.start?.dateTime || ev.start?.date}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* WhatsApp */}
      <section className="jos-card p-5 mb-4">
        <p className="jos-label mb-1">{PROVIDERS.whatsapp.label}</p>
        <p className="text-[12px] text-jos-muted mb-3">{PROVIDERS.whatsapp.description}</p>
        <textarea
          className="w-full bg-jos-surface border border-jos-border rounded-lg py-3 px-4 text-jos-text text-sm min-h-[100px] outline-none focus:border-jos-accent resize-y"
          placeholder="Paste a WhatsApp conversation…"
          value={whatsappPaste}
          onChange={(e) => setWhatsappPaste(e.target.value)}
        />
        <Button
          size="sm"
          className="mt-2"
          disabled={loading || !whatsappPaste.trim()}
          onClick={async () => {
            await importWhatsApp(whatsappPaste)
            setWhatsappPaste('')
          }}
        >
          Extract actions
        </Button>
      </section>

      {/* Social tokens */}
      <section className="jos-card p-5 mb-4">
        <p className="jos-label mb-1">Social publishing</p>
        <p className="text-[12px] text-jos-muted mb-3">
          Save an API access token for LinkedIn or Facebook. Posts are queued for approval in Social.
        </p>
        <Input
          label="LinkedIn access token (optional)"
          type="password"
          revealable
          value={linkedInToken}
          onChange={(e) => setLinkedInToken(e.target.value)}
          placeholder="Paste token from LinkedIn Developer app"
        />
        <Button
          size="sm"
          variant="ghost"
          disabled={!linkedInToken.trim()}
          onClick={() => saveSocialToken('linkedin', linkedInToken.trim())}
        >
          Save LinkedIn token
        </Button>
      </section>

      {/* Inbox */}
      <section className="jos-card p-5 mb-4">
        <p className="jos-label mb-3">Action inbox</p>
        <IntegrationInbox />
      </section>

      {/* Team */}
      {canUseTeam(profile) && (
        <section className="jos-card p-5 mb-4">
          <p className="jos-label mb-1">Team workspace</p>
          <p className="text-[12px] text-jos-muted mb-3">
            Shared projects, delegated tasks, and weekly team review (Operator+ / Team tier).
          </p>
          {!team ? (
            <div className="flex gap-2 flex-wrap">
              <Input
                placeholder="Team name"
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                className="flex-1 min-w-[140px] mb-0"
              />
              <Button
                size="sm"
                disabled={!teamName.trim()}
                onClick={() => createTeam(teamName.trim())}
              >
                Create team
              </Button>
            </div>
          ) : (
            <>
              <p className="text-sm font-medium text-jos-text mb-2">{team.name}</p>
              <ul className="text-[12px] text-jos-muted space-y-1 mb-3">
                {members.map((m) => (
                  <li key={m.id}>
                    {m.email} — {m.role}
                    {m.joined_at ? '' : ' (invited)'}
                  </li>
                ))}
              </ul>
              <div className="flex gap-2 flex-wrap">
                <Input
                  placeholder="Invite email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="flex-1 min-w-[140px] mb-0"
                />
                <Button
                  size="sm"
                  disabled={!inviteEmail.trim()}
                  onClick={() => {
                    inviteMember(inviteEmail)
                    setInviteEmail('')
                  }}
                >
                  Invite
                </Button>
              </div>
            </>
          )}
        </section>
      )}

      <p className="text-[11px] text-jos-muted">
        <Link to="/profile" className="text-jos-accent hover:underline">Profile</Link>
        {' · '}
        <Link to="/social" className="text-jos-accent hover:underline">Social</Link>
      </p>
    </div>
  )
}
