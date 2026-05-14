import { useState, useEffect } from 'react'
import useReminderStore from '../store/reminderStore'
import Button from './ui/Button'
import Badge from './ui/Badge'

function gcalUrl(title, datetime, durationMins = 60, notes = '') {
  const start = new Date(datetime)
  const end = new Date(start.getTime() + durationMins * 60000)
  const fmt = d => d.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z'
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${encodeURIComponent(title)}&dates=${fmt(start)}/${fmt(end)}&details=${encodeURIComponent(notes)}`
}

export default function RemindersPanel() {
  const { reminders, fetchReminders, addReminder, toggleReminder, deleteReminder, getUpcoming, getOverdue } = useReminderStore()
  const [showAdd, setShowAdd] = useState(false)
  const [type, setType] = useState('reminder') // reminder | meeting
  const [form, setForm] = useState({ title: '', datetime: '', notes: '', duration: 60 })
  const [showAll, setShowAll] = useState(false)

  useEffect(() => { fetchReminders() }, [])

  // Browser notification
  useEffect(() => {
    if (typeof Notification === 'undefined') return
    if (Notification.permission === 'default') Notification.requestPermission()

    const interval = setInterval(() => {
      const now = new Date()
      getUpcoming().forEach(r => {
        const dt = new Date(r.datetime)
        const diffMins = (dt - now) / 60000
        if (diffMins > 0 && diffMins <= 1 && !r.notified) {
          if (Notification.permission === 'granted') {
            new Notification(`J·OS: ${r.title}`, { body: r.notes || 'Reminder' })
          }
        }
      })
    }, 30000)

    return () => clearInterval(interval)
  }, [reminders])

  const handleAdd = async () => {
    if (!form.title.trim() || !form.datetime) return
    await addReminder({
      title: form.title.trim(),
      datetime: form.datetime,
      notes: form.notes.trim(),
      type,
      duration: Number(form.duration),
    })
    setForm({ title: '', datetime: '', notes: '', duration: 60 })
    setShowAdd(false)
  }

  const upcoming = getUpcoming()
  const overdue = getOverdue()
  const visible = showAll ? upcoming : upcoming.slice(0, 3)

  const fmtDt = (iso) => {
    const d = new Date(iso)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    const isToday = d.toDateString() === today.toDateString()
    const isTomorrow = d.toDateString() === tomorrow.toDateString()
    const timeStr = d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
    if (isToday) return `Today · ${timeStr}`
    if (isTomorrow) return `Tomorrow · ${timeStr}`
    return d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' }) + ` · ${timeStr}`
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <p className="text-[10px] tracking-[0.2em] uppercase text-[#444] font-medium">
          Reminders & Meetings
        </p>
        <Button variant="ghost" size="xs" onClick={() => setShowAdd(!showAdd)}>
          + Add
        </Button>
      </div>

      {/* Overdue */}
      {overdue.length > 0 && (
        <div className="mb-3">
          {overdue.map(r => (
            <div key={r.id} className="flex items-start gap-3 px-4 py-3 bg-[#ef4444]/[0.06] border border-[#ef4444]/20 rounded-md mb-1.5">
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium text-[#f87171]">{r.title}</p>
                <p className="text-[10px] text-[#f87171]/60 mt-0.5">Overdue · {fmtDt(r.datetime)}</p>
              </div>
              <div className="flex gap-1.5 flex-shrink-0">
                <Button variant="solid" size="xs" onClick={() => toggleReminder(r.id)}>Done</Button>
                <button onClick={() => deleteReminder(r.id)} className="text-[#444] hover:text-[#888] text-[12px] px-1">✕</button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upcoming */}
      {visible.length === 0 && overdue.length === 0 && !showAdd && (
        <p className="text-[12px] text-[#444] font-light mb-3">No upcoming reminders or meetings.</p>
      )}

      <div className="space-y-1.5 mb-2">
        {visible.map(r => (
          <div key={r.id} className="flex items-start gap-3 px-4 py-3 bg-[#111] border border-[#1f1f1f] rounded-md hover:border-[#2a2a2a] transition-colors">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                <p className="text-[13px] font-medium">{r.title}</p>
                <Badge color={r.type === 'meeting' ? 'blue' : 'dim'}>
                  {r.type === 'meeting' ? '📅 Meeting' : '🔔 Reminder'}
                </Badge>
              </div>
              <p className="text-[11px] text-[#888] font-light">{fmtDt(r.datetime)}</p>
              {r.notes && <p className="text-[11px] text-[#444] font-light mt-0.5 line-clamp-1">{r.notes}</p>}
            </div>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              {r.type === 'meeting' && (
                <a href={gcalUrl(r.title, r.datetime, r.duration, r.notes)} target="_blank" rel="noreferrer">
                  <Button variant="ghost" size="xs">Cal ↗</Button>
                </a>
              )}
              <Button variant="muted" size="xs" onClick={() => toggleReminder(r.id)}>Done</Button>
              <button onClick={() => deleteReminder(r.id)} className="text-[#2a2a2a] hover:text-[#444] text-[12px] px-1 transition-colors">✕</button>
            </div>
          </div>
        ))}
      </div>

      {upcoming.length > 3 && (
        <button onClick={() => setShowAll(!showAll)} className="text-[11px] text-[#444] hover:text-[#888] transition-colors">
          {showAll ? 'Show less ↑' : `+${upcoming.length - 3} more ↓`}
        </button>
      )}

      {/* Add form */}
      {showAdd && (
        <div className="bg-[#181818] border border-[#2a2a2a] rounded-md p-4 mt-3 animate-fadeUp">
          <div className="flex gap-2 mb-3">
            {['reminder', 'meeting'].map(t => (
              <button
                key={t}
                onClick={() => setType(t)}
                className={`px-3 py-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase rounded border transition-all capitalize ${
                  type === t ? 'bg-white text-[#080808] border-white' : 'border-[#333] text-[#444] hover:text-[#888]'
                }`}
              >
                {t === 'meeting' ? '📅 Meeting' : '🔔 Reminder'}
              </button>
            ))}
          </div>

          <input
            className="w-full bg-[#111] border border-[#2a2a2a] rounded py-2.5 px-3 text-white text-[13px] font-light outline-none focus:border-[#333] placeholder:text-[#444] mb-2"
            placeholder={type === 'meeting' ? 'Meeting title e.g. Investor call with John' : 'Reminder e.g. Follow up with Transport Team lead'}
            value={form.title}
            onChange={e => setForm(s => ({ ...s, title: e.target.value }))}
          />

          <div className={`gap-2 mb-2 ${type === 'meeting' ? 'grid grid-cols-2' : ''}`}>
            <input
              type="datetime-local"
              className="w-full bg-[#111] border border-[#2a2a2a] rounded py-2.5 px-3 text-white text-[13px] font-light outline-none focus:border-[#333] mb-2"
              value={form.datetime}
              onChange={e => setForm(s => ({ ...s, datetime: e.target.value }))}
            />
            {type === 'meeting' && (
              <select
                className="w-full bg-[#111] border border-[#2a2a2a] rounded py-2.5 px-3 text-white text-[13px] font-light outline-none focus:border-[#333] mb-2"
                value={form.duration}
                onChange={e => setForm(s => ({ ...s, duration: e.target.value }))}
              >
                <option value={15}>15 min</option>
                <option value={30}>30 min</option>
                <option value={45}>45 min</option>
                <option value={60}>1 hour</option>
                <option value={90}>1.5 hours</option>
                <option value={120}>2 hours</option>
              </select>
            )}
          </div>

          <input
            className="w-full bg-[#111] border border-[#2a2a2a] rounded py-2.5 px-3 text-white text-[13px] font-light outline-none focus:border-[#333] placeholder:text-[#444] mb-3"
            placeholder="Notes (optional)"
            value={form.notes}
            onChange={e => setForm(s => ({ ...s, notes: e.target.value }))}
          />

          <div className="flex gap-2 items-center">
            <Button variant="solid" size="sm" onClick={handleAdd}>
              + {type === 'meeting' ? 'Add Meeting' : 'Set Reminder'}
            </Button>
            {type === 'meeting' && form.title && form.datetime && (
              <a href={gcalUrl(form.title, form.datetime, form.duration, form.notes)} target="_blank" rel="noreferrer">
                <Button variant="ghost" size="sm">+ Google Calendar ↗</Button>
              </a>
            )}
            <Button variant="muted" size="xs" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  )
}