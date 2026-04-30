import { useEffect, useState } from 'react'
import useInvestorStore from '../../store/investorStore'
import useAuthStore from '../../store/authStore'
import useProjectStore from '../../store/projectStore'
import useRevenueStore from '../../store/revenueStore'
import { askClaude } from '../../lib/claude'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'

const SENTIMENT_COLORS = {
  warm:    { color: '#4ade80', label: 'Warm'    },
  neutral: { color: '#e8e8e8', label: 'Neutral' },
  cold:    { color: '#f87171', label: 'Cold'    },
}

export default function Investors() {
  const {
    investors, updates, loading,
    fetchInvestors, addInvestor, deleteInvestor,
    saveUpdate, markSent, daysSinceUpdate
  } = useInvestorStore()

  const profile    = useAuthStore(s => s.profile)
  const { projects } = useProjectStore()
  const { entries }  = useRevenueStore()

  const [showAdd,      setShowAdd]      = useState(false)
  const [drafting,     setDrafting]     = useState(null) // investor id being drafted for
  const [draftText,    setDraftText]    = useState('')
  const [draftSubject, setDraftSubject] = useState('')
  const [generating,   setGenerating]   = useState(false)
  const [activeTab,    setActiveTab]    = useState('investors') // investors | updates

  const [form, setForm] = useState({
    name: '', company: '', amount: '', currency: '£',
    equity_percent: '', invested_date: '',
    contact_email: '', contact_phone: '', notes: '', sentiment: 'warm',
  })

  useEffect(() => {
    fetchInvestors()
  }, [])

  const handleAdd = async () => {
    if (!form.name.trim()) return
    await addInvestor({
      name:           form.name.trim(),
      company:        form.company.trim(),
      amount:         form.amount ? Number(form.amount) : null,
      currency:       form.currency,
      equity_percent: form.equity_percent ? Number(form.equity_percent) : null,
      invested_date:  form.invested_date || null,
      contact_email:  form.contact_email.trim(),
      contact_phone:  form.contact_phone.trim(),
      notes:          form.notes.trim(),
      sentiment:      form.sentiment,
    })
    setForm({ name:'',company:'',amount:'',currency:'£',equity_percent:'',invested_date:'',contact_email:'',contact_phone:'',notes:'',sentiment:'warm' })
    setShowAdd(false)
  }

  const handleGenerateUpdate = async (investor) => {
    setDrafting(investor.id)
    setGenerating(true)
    setDraftText('')
    setDraftSubject('')

    const ri = entries.filter(e => e.type === 'in').reduce((s, e) => s + Number(e.amount), 0)
    const ro = entries.filter(e => e.type === 'out').reduce((s, e) => s + Number(e.amount), 0)
    const activeProjects = projects.filter(p => p.status === 'Active' || p.status === 'active')

    const sys = `You are a founder writing a professional investor update email. Be concise, honest, and specific. Use data. Show momentum. End with one clear ask or next step. Under 300 words. Professional but personal tone — not corporate.`

    const prompt = `Write a monthly investor update email for ${investor.name}${investor.company ? ' at ' + investor.company : ''}.

FOUNDER: ${profile?.name || 'Sam'}, ${profile?.role || 'Founder'} at J. Ednieds Ltd
INVESTOR CONTEXT: Invested ${investor.currency || '£'}${investor.amount || 'amount undisclosed'}${investor.equity_percent ? ` for ${investor.equity_percent}% equity` : ''}

CURRENT MONTH DATA:
Revenue in: £${ri.toLocaleString()}
Revenue out: £${ro.toLocaleString()}
Net: £${(ri - ro).toLocaleString()}

ACTIVE PROJECTS (${activeProjects.length}):
${activeProjects.map(p => `- ${p.name}: ${p.status}. ${p.notes || ''}`).join('\n') || 'None listed'}

KEY UPDATES:
${profile?.about ? profile.about.slice(0, 400) : 'Building SaaS products for diaspora markets.'}

Write the email with:
1. Subject line (prefix with SUBJECT:)
2. Opening — one punchy sentence on momentum
3. Key wins this month (2-3 bullet points with specifics)
4. What the money is doing
5. Next 30 days focus
6. One clear ask (intro, advice, or resource)
7. Professional sign-off`

    const reply = await askClaude([{ role: 'user', content: prompt }], sys)
    setGenerating(false)

    // Parse subject from reply
    const lines = reply.split('\n')
    const subjectLine = lines.find(l => l.startsWith('SUBJECT:'))
    const subject = subjectLine
      ? subjectLine.replace('SUBJECT:', '').trim()
      : `Update from ${profile?.name || 'Sam'} — ${new Date().toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })}`
    const body = reply.replace(subjectLine || '', '').trim()

    setDraftSubject(subject)
    setDraftText(body)
  }

  const handleSaveUpdate = async () => {
    if (!drafting || !draftText.trim()) return
    await saveUpdate(drafting, draftSubject, draftText)
    setDrafting(null)
    setDraftText('')
    setDraftSubject('')
    setActiveTab('updates')
  }

  const totalInvested = investors.reduce((s, i) => s + (Number(i.amount) || 0), 0)
  const overdueUpdates = investors.filter(i => {
    const days = daysSinceUpdate(i)
    return days === null || days > 30
  })

  const fd = (iso) => iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

  return (
    <div className="animate-fadeUp max-w-2xl">
      <p className="text-[10px] tracking-[0.2em] uppercase text-[#444] font-medium mb-2">Relations</p>
      <h1 className="font-serif text-[24px] sm:text-[26px] font-bold mb-1">
        Investor <em className="text-[#e8e8e8]">Management</em>
      </h1>
      <p className="text-[13px] text-[#888] font-light mb-6">
        Keep investors informed, warm, and engaged — automatically.
      </p>

      {/* Alert for overdue updates */}
      {overdueUpdates.length > 0 && (
        <div className="mb-5 px-4 py-3 bg-[#f59e0b]/[0.07] border border-[#f59e0b]/20 rounded-md">
          <p className="text-[12px] text-[#fbbf24] font-light">
            ⚠ {overdueUpdates.length} investor{overdueUpdates.length > 1 ? 's' : ''} haven't received an update in over 30 days.
            {' '}<button onClick={() => setActiveTab('investors')} className="underline">Review now →</button>
          </p>
        </div>
      )}

      {/* Stats */}
      {investors.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-6">
          {[
            { label: 'Investors',        value: investors.length                                },
            { label: 'Total Invested',   value: `£${totalInvested.toLocaleString()}`           },
            { label: 'Updates Sent',     value: updates.filter(u => u.sent).length              },
          ].map(s => (
            <div key={s.label} className="bg-[#111] border border-[#1f1f1f] rounded-md p-3 text-center">
              <p className="text-[9px] tracking-[0.14em] uppercase text-[#444] font-medium mb-1.5">{s.label}</p>
              <p className="font-serif text-[20px] font-bold">{s.value}</p>
            </div>
          ))}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 mb-5">
        {['investors', 'updates'].map(t => (
          <button key={t} onClick={() => setActiveTab(t)}
            className={`px-4 py-1.5 text-[11px] font-semibold tracking-[0.1em] uppercase rounded transition-colors capitalize ${
              activeTab === t ? 'text-white bg-[#181818]' : 'text-[#444] hover:text-[#888]'
            }`}>
            {t}
          </button>
        ))}
        <div className="flex-1" />
        <Button variant="ghost" size="sm" onClick={() => setShowAdd(!showAdd)}>
          + Add Investor
        </Button>
      </div>

      {/* Add investor form */}
      {showAdd && (
        <div className="bg-[#111] border border-[#1f1f1f] rounded-md p-4 mb-5 animate-fadeUp">
          <p className="text-[10px] tracking-[0.16em] uppercase text-[#444] font-medium mb-4">Add Investor</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
            <input className="bg-[#181818] border border-[#2a2a2a] rounded py-2.5 px-3 text-white text-[13px] font-light outline-none focus:border-[#333] placeholder:text-[#444]"
              placeholder="Investor name *" value={form.name} onChange={e => setForm(s => ({...s,name:e.target.value}))} />
            <input className="bg-[#181818] border border-[#2a2a2a] rounded py-2.5 px-3 text-white text-[13px] font-light outline-none focus:border-[#333] placeholder:text-[#444]"
              placeholder="Company (optional)" value={form.company} onChange={e => setForm(s => ({...s,company:e.target.value}))} />
            <input className="bg-[#181818] border border-[#2a2a2a] rounded py-2.5 px-3 text-white text-[13px] font-light outline-none focus:border-[#333] placeholder:text-[#444]"
              placeholder="Amount invested" type="number" value={form.amount} onChange={e => setForm(s => ({...s,amount:e.target.value}))} />
            <input className="bg-[#181818] border border-[#2a2a2a] rounded py-2.5 px-3 text-white text-[13px] font-light outline-none focus:border-[#333] placeholder:text-[#444]"
              placeholder="Equity %" type="number" value={form.equity_percent} onChange={e => setForm(s => ({...s,equity_percent:e.target.value}))} />
            <input className="bg-[#181818] border border-[#2a2a2a] rounded py-2.5 px-3 text-white text-[13px] font-light outline-none focus:border-[#333] placeholder:text-[#444]"
              placeholder="Email" type="email" value={form.contact_email} onChange={e => setForm(s => ({...s,contact_email:e.target.value}))} />
            <input type="date" className="bg-[#181818] border border-[#2a2a2a] rounded py-2.5 px-3 text-[#888] text-[13px] font-light outline-none focus:border-[#333]"
              value={form.invested_date} onChange={e => setForm(s => ({...s,invested_date:e.target.value}))} />
          </div>
          <textarea className="w-full bg-[#181818] border border-[#2a2a2a] rounded py-2.5 px-3 text-white text-[13px] font-light outline-none focus:border-[#333] placeholder:text-[#444] resize-none mb-3"
            rows={2} placeholder="Notes about this investor (optional)" value={form.notes}
            onChange={e => setForm(s => ({...s,notes:e.target.value}))} />
          <div className="flex gap-2 mb-3">
            {['warm','neutral','cold'].map(s => (
              <button key={s} onClick={() => setForm(f => ({...f,sentiment:s}))}
                className={`px-3 py-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase rounded border transition-all capitalize ${
                  form.sentiment === s ? 'bg-white text-[#080808] border-white' : 'border-[#2a2a2a] text-[#444] hover:text-[#888]'
                }`}>{s}</button>
            ))}
          </div>
          <div className="flex gap-2">
            <Button variant="solid" size="sm" onClick={handleAdd}>+ Add</Button>
            <Button variant="muted" size="xs" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Investors tab */}
      {activeTab === 'investors' && (
        <div>
          {loading && investors.length === 0 && (
            <div className="flex justify-center py-8">
              <div className="w-5 h-5 border-2 border-[#2a2a2a] border-t-white rounded-full animate-spin" />
            </div>
          )}
          {!loading && investors.length === 0 && (
            <div className="text-center py-10 text-[#444]">
              <p className="text-[28px] mb-2">◈</p>
              <p className="text-[13px] font-light">No investors yet. Add your first above.</p>
            </div>
          )}
          <div className="space-y-3">
            {investors.map(inv => {
              const daysSince = daysSinceUpdate(inv)
              const isOverdue = daysSince === null || daysSince > 30
              const sent = SENTIMENT_COLORS[inv.sentiment] || SENTIMENT_COLORS.warm

              return (
                <div key={inv.id} className={`bg-[#111] border rounded-md p-4 ${isOverdue ? 'border-[#f59e0b]/20' : 'border-[#1f1f1f]'}`}>
                  {/* Header */}
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="text-[15px] font-semibold">{inv.name}</p>
                      {inv.company && <p className="text-[12px] text-[#888] font-light mt-0.5">{inv.company}</p>}
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className="text-[10px] font-bold tracking-[0.08em] uppercase px-2 py-0.5 rounded-sm border"
                        style={{ color: sent.color, background: `${sent.color}18`, borderColor: `${sent.color}33` }}>
                        {sent.label}
                      </span>
                      <button onClick={() => deleteInvestor(inv.id)}
                        className="text-[#2a2a2a] hover:text-[#444] text-[12px] transition-colors">✕</button>
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex flex-wrap gap-4 mb-3 text-[12px]">
                    {inv.amount && <span className="text-[#888]">💰 {inv.currency || '£'}{Number(inv.amount).toLocaleString()}</span>}
                    {inv.equity_percent && <span className="text-[#888]">📊 {inv.equity_percent}% equity</span>}
                    {inv.invested_date && <span className="text-[#888]">📅 {fd(inv.invested_date)}</span>}
                    {inv.contact_email && <span className="text-[#888]">✉ {inv.contact_email}</span>}
                  </div>

                  {/* Last update */}
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <p className={`text-[11px] font-light ${isOverdue ? 'text-[#fbbf24]' : 'text-[#444]'}`}>
                      {daysSince === null
                        ? '⚠ Never sent an update'
                        : isOverdue
                          ? `⚠ Last update ${daysSince} days ago — overdue`
                          : `✓ Updated ${daysSince} day${daysSince === 1 ? '' : 's'} ago`}
                    </p>
                    <Button variant="ghost" size="xs"
                      onClick={() => handleGenerateUpdate(inv)}
                      disabled={generating && drafting === inv.id}>
                      {generating && drafting === inv.id ? '…' : '✦ Draft Update'}
                    </Button>
                  </div>

                  {/* Draft panel */}
                  {drafting === inv.id && !generating && draftText && (
                    <div className="mt-4 pt-4 border-t border-[#1f1f1f] animate-fadeUp">
                      <p className="text-[10px] tracking-[0.14em] uppercase text-[#444] font-medium mb-3">
                        AI Draft — Review before sending
                      </p>
                      <input
                        className="w-full bg-[#181818] border border-[#2a2a2a] rounded py-2 px-3 text-white text-[12px] font-medium outline-none focus:border-[#333] mb-2"
                        value={draftSubject}
                        onChange={e => setDraftSubject(e.target.value)}
                        placeholder="Subject line"
                      />
                      <textarea
                        className="w-full bg-[#181818] border border-[#2a2a2a] rounded py-3 px-3 text-white text-[12px] font-light outline-none focus:border-[#333] resize-y min-h-[200px] mb-3 leading-relaxed"
                        value={draftText}
                        onChange={e => setDraftText(e.target.value)}
                      />
                      <div className="flex gap-2 flex-wrap">
                        <Button variant="solid" size="sm" onClick={handleSaveUpdate}>
                          ✓ Save & Mark Sent
                        </Button>
                        {inv.contact_email && (
                          <a href={`mailto:${inv.contact_email}?subject=${encodeURIComponent(draftSubject)}&body=${encodeURIComponent(draftText)}`}>
                            <Button variant="green" size="sm">Open in Email ↗</Button>
                          </a>
                        )}
                        <button
                          onClick={() => { navigator.clipboard.writeText(`Subject: ${draftSubject}\n\n${draftText}`) }}
                          className="px-3 py-1.5 text-[11px] font-semibold uppercase border border-[#2a2a2a] text-[#888] rounded hover:text-white transition-all"
                        >
                          📋 Copy
                        </button>
                        <Button variant="muted" size="xs" onClick={() => setDrafting(null)}>Cancel</Button>
                      </div>
                    </div>
                  )}

                  {generating && drafting === inv.id && (
                    <div className="mt-4 pt-4 border-t border-[#1f1f1f] flex items-center gap-3">
                      <div className="flex gap-1.5">
                        {[0,0.15,0.3].map((d,i) => (
                          <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#444] animate-bounce" style={{animationDelay:`${d}s`}} />
                        ))}
                      </div>
                      <p className="text-[12px] text-[#444] font-light">Drafting investor update…</p>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Updates tab */}
      {activeTab === 'updates' && (
        <div>
          {updates.length === 0 && (
            <p className="text-[13px] text-[#444] font-light text-center py-8">No updates sent yet.</p>
          )}
          <div className="space-y-2">
            {updates.map(u => {
              const inv = investors.find(i => i.id === u.investor_id)
              return (
                <div key={u.id} className="bg-[#111] border border-[#1f1f1f] rounded-md p-4">
                  <div className="flex items-center justify-between mb-2 flex-wrap gap-2">
                    <div>
                      <p className="text-[13px] font-medium">{u.subject || 'Investor Update'}</p>
                      {inv && <p className="text-[11px] text-[#444] font-light mt-0.5">To: {inv.name}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge color={u.sent ? 'green' : 'dim'}>{u.sent ? 'Sent' : 'Draft'}</Badge>
                      <span className="text-[10px] text-[#444]">
                        {new Date(u.created_at).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </div>
                  <p className="text-[12px] text-[#888] font-light leading-relaxed line-clamp-2">{u.body}</p>
                  {!u.sent && (
                    <button onClick={() => markSent(u.id)}
                      className="text-[11px] text-[#4ade80] hover:text-[#86efac] transition-colors mt-2">
                      Mark as sent →
                    </button>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}