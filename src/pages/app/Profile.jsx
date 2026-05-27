import { useState } from 'react'
import useAuthStore from '../../store/authStore'
import Button from '../../components/ui/Button'
import Input from '../../components/ui/Input'
import { Link } from 'react-router-dom'
import { getTier, tierLabel, LIMITS, canUseIntegrations } from '../../lib/subscription'
import { authorityDescription, AUTH_LABELS, getAuthorityLevel, allowedAuthorityLevels } from '../../lib/authority'
import { getBehaviourSummary } from '../../lib/behaviour'
import { ingestMemory } from '../../lib/memory'

const CURRENCIES = ['£ GBP', '$ USD', '€ EUR', '₦ NGN', 'R ZAR', '¥ JPY']
const NOTIF_STYLES = ['strict', 'balanced', 'gentle']
const MAX_PROFILE_PHOTO_BYTES = 2 * 1024 * 1024
const ALLOWED_PROFILE_MIME = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

export default function Profile() {
  const { profile, updateProfile, user } = useAuthStore()
  const auth = authorityDescription(profile)
  const behaviour = getBehaviourSummary()
  const [editingInfo, setEditingInfo] = useState(false)
  const [editingAbout, setEditingAbout] = useState(false)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: profile?.name || '',
    role: profile?.role || '',
    location: profile?.location || '',
    timezone: profile?.timezone || '',
    currency: profile?.currency || '£',
    notif_style: profile?.notif_style || 'balanced',
    about: profile?.about || '',
  })

  const initials = profile?.name
    ? profile.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
    : '?'

  const handleSave = async (fields) => {
    setSaving(true)
    const updates = {}
    fields.forEach(k => { updates[k] = form[k] })
    await updateProfile(updates)
    if (fields.includes('about') && form.about?.trim() && user?.id) {
      await ingestMemory(user.id, 'about', form.about.trim())
    }
    setSaving(false)
    setEditingInfo(false)
    setEditingAbout(false)
  }

  const f = (key) => ({
    value: form[key],
    onChange: (e) => setForm(s => ({ ...s, [key]: e.target.value }))
  })

  return (
    <div className="animate-fadeUp max-w-xl">
      <p className="text-[10px] tracking-[0.2em] uppercase text-[#444] font-medium mb-2">Account</p>
      <h1 className="font-serif text-[24px] sm:text-[26px] font-bold mb-6">
        My <em className="text-[#e8e8e8]">Profile</em>
      </h1>

      {/* Avatar + name */}
      <div className="bg-[#111] border border-[#1f1f1f] rounded-md p-5 mb-4">
        <div className="flex items-center gap-4 mb-5">
          <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-[20px] font-bold text-[#080808] flex-shrink-0">
            {initials}
          </div>
          <div>
            <p className="text-[17px] font-bold">{profile?.name}</p>
            <p className="text-[12px] text-[#888] font-light">{profile?.role || 'No role set'}</p>
            <p className="text-[11px] text-[#444] mt-0.5">{profile?.location || 'No location set'}</p>
          </div>
        </div>

{/* Profile photo */}
<div className="flex flex-col items-center gap-2">
            {(() => {
              const saved = localStorage.getItem('jos_profile_photo')
              return saved
                ? <img src={saved} alt="Profile" className="w-14 h-14 rounded-full object-cover border border-[#2a2a2a]" />
                : <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center text-[20px] font-bold text-[#080808]">{initials}</div>
            })()}
            <label className="cursor-pointer text-[10px] text-[#444] underline hover:text-[#888] transition-colors">
              {localStorage.getItem('jos_profile_photo') ? 'Change photo' : 'Add photo'}
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files[0]
                  if (!file) return
                  if (!ALLOWED_PROFILE_MIME.has(file.type)) return
                  if (file.size > MAX_PROFILE_PHOTO_BYTES) return
                  const reader = new FileReader()
                  reader.onload = (ev) => {
                    localStorage.setItem('jos_profile_photo', ev.target.result)
                    window.location.reload() // refresh to show new photo
                  }
                  reader.readAsDataURL(file)
                }}
              />
            </label>
          </div>
          
        {!editingInfo ? (
          <Button variant="ghost" size="sm" onClick={() => setEditingInfo(true)}>Edit Info</Button>
        ) : (
          <div>
            <Input label="Full Name" {...f('name')} />
            <Input label="Role / What you do" placeholder="e.g. Founder, Designer…" {...f('role')} />
            <div className="grid grid-cols-2 gap-3">
              <Input label="City" placeholder="e.g. London, Lagos…" {...f('location')} />
              <Input label="Timezone" placeholder="e.g. GMT, WAT…" {...f('timezone')} />
            </div>
            <div className="flex gap-2 mt-1">
              <Button variant="solid" size="sm" onClick={() => handleSave(['name','role','location','timezone'])} disabled={saving}>
                {saving ? 'Saving…' : 'Save'}
              </Button>
              <Button variant="muted" size="xs" onClick={() => setEditingInfo(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </div>

      {/* About Me / Memory */}
      <div className="bg-[#111] border border-[#1f1f1f] rounded-md p-5 mb-4">
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="text-[10px] tracking-[0.16em] uppercase text-[#444] font-medium mb-1">About Me — AI Memory</p>
            <p className="text-[12px] text-[#888] font-light leading-relaxed">
              Tell J·OS everything about you — your background, values, lifestyle, how you work best, what motivates you, family situation, health, finances. The more detail, the better J·OS can advise you.
            </p>
          </div>
        </div>

        {!editingAbout ? (
          <div>
            {profile?.about ? (
              <div className="bg-[#181818] border border-[#2a2a2a] rounded-md p-4 mb-3">
                <p className="text-[13px] text-[#888] font-light leading-relaxed whitespace-pre-wrap">
                  {profile.about}
                </p>
              </div>
            ) : (
              <div className="bg-[#181818] border border-dashed border-[#2a2a2a] rounded-md p-4 mb-3 text-center">
                <p className="text-[12px] text-[#444] font-light">No about info yet. The more you share, the better J·OS knows you.</p>
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={() => {
              setForm(s => ({ ...s, about: profile?.about || '' }))
              setEditingAbout(true)
            }}>
              {profile?.about ? 'Edit Memory' : '+ Add About Me'}
            </Button>
          </div>
        ) : (
          <div>
            <p className="text-[11px] text-[#444] font-light mb-2">
              Examples: "I'm a Nigerian-born founder based in Newcastle. I have 2 kids. I work best in the mornings. I'm building 3 SaaS products. My main income is from consulting at £X/day. I struggle with consistency on marketing tasks…"
            </p>
            <textarea
              className="w-full bg-[#181818] border border-[#2a2a2a] rounded py-3 px-4 text-white text-[13px] font-light outline-none focus:border-[#333] placeholder:text-[#444] resize-y mb-3"
              rows={8}
              placeholder="Write freely about yourself — your life, work style, goals, struggles, motivations, relationships, finances, health…"
              value={form.about}
              onChange={e => setForm(s => ({ ...s, about: e.target.value }))}
            />
            <div className="flex gap-2">
              <Button variant="solid" size="sm" onClick={() => handleSave(['about'])} disabled={saving}>
                {saving ? 'Saving…' : 'Save Memory'}
              </Button>
              <Button variant="muted" size="xs" onClick={() => setEditingAbout(false)}>Cancel</Button>
            </div>
          </div>
        )}
      </div>

      {/* Preferences */}
      <div className="bg-[#111] border border-[#1f1f1f] rounded-md p-5 mb-4">
        <p className="text-[10px] tracking-[0.16em] uppercase text-[#444] font-medium mb-4">Preferences</p>

        <div className="mb-5">
          <p className="text-[11px] text-[#888] mb-2 font-medium">Currency</p>
          <div className="flex flex-wrap gap-2">
            {CURRENCIES.map(c => {
              const symbol = c.split(' ')[0]
              return (
                <button
                  key={c}
                  onClick={() => setForm(s => ({ ...s, currency: symbol }))}
                  className={`px-3 py-1.5 text-[12px] font-medium rounded border transition-all ${
                    form.currency === symbol
                      ? 'bg-white text-[#080808] border-white'
                      : 'bg-transparent text-[#444] border-[#2a2a2a] hover:border-[#333] hover:text-[#888]'
                  }`}
                >
                  {c}
                </button>
              )
            })}
          </div>
        </div>

        <div className="mb-5">
          <p className="text-[11px] text-[#888] mb-2 font-medium">Notification Style</p>
          <div className="flex gap-2 flex-wrap">
            {NOTIF_STYLES.map(s => (
              <button
                key={s}
                onClick={() => setForm(f => ({ ...f, notif_style: s }))}
                className={`px-4 py-2 text-[11px] font-semibold tracking-[0.08em] uppercase rounded border transition-all capitalize ${
                  form.notif_style === s
                    ? 'bg-white text-[#080808] border-white'
                    : 'bg-transparent text-[#444] border-[#2a2a2a] hover:border-[#333] hover:text-[#888]'
                }`}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        <Button variant="solid" size="sm" onClick={() => handleSave(['currency','notif_style'])} disabled={saving}>
          {saving ? 'Saving…' : 'Save Preferences'}
        </Button>
      </div>

      {/* Plan */}
      <div className="bg-[#111] border border-[#1f1f1f] rounded-md p-5 mb-4">
        <p className="text-[10px] tracking-[0.16em] uppercase text-[#444] font-medium mb-3">Your Plan</p>
        <p className="font-serif text-[20px] font-bold mb-2">{tierLabel(getTier(profile))}</p>
        {getTier(profile) === 'free' && (
          <p className="text-[12px] text-[#888] font-light leading-relaxed mb-3">
            Personal (£9/mo): unlimited projects & goals, full Daily Focus, 100 AI messages/day, preview authority.
            Operator (£29/mo): unlimited AI, investors, full execute authority (auto pivot & tier enforcement).
          </p>
        )}
        <p className="text-[10px] text-[#444]">
          Stripe billing — Phase 5. Limits: {LIMITS[getTier(profile)]?.projects === Infinity ? '∞' : LIMITS[getTier(profile)]?.projects} projects, {LIMITS[getTier(profile)]?.chatMessagesPerDay === Infinity ? '∞' : LIMITS[getTier(profile)]?.chatMessagesPerDay} AI msgs/day.
        </p>
        {canUseIntegrations(profile) && (
          <Link
            to="/integrations"
            className="inline-block mt-3 text-[11px] text-jos-accent hover:underline"
          >
            Open Integrations (Gmail, Calendar, WhatsApp) →
          </Link>
        )}
      </div>

      {/* Progressive Authority */}
      <div className="bg-[#111] border border-[#1f1f1f] rounded-md p-5 mb-4">
        <p className="text-[10px] tracking-[0.16em] uppercase text-[#444] font-medium mb-3">
          AI Authority
        </p>
        <p className="font-serif text-[18px] font-bold mb-2">{auth.label}</p>
        <p className="text-[12px] text-[#888] font-light leading-relaxed mb-4">{auth.text}</p>
        <div className="flex flex-wrap gap-2 mb-4">
          {allowedAuthorityLevels(getTier(profile)).map((level) => (
            <button
              key={level}
              type="button"
              onClick={() => updateProfile({ authority_level: level })}
              className={`px-3 py-1.5 text-[10px] font-semibold tracking-[0.08em] uppercase rounded border transition-colors ${
                getAuthorityLevel(profile) === level
                  ? 'bg-white text-[#080808] border-white'
                  : 'bg-transparent text-[#444] border-[#2a2a2a] hover:border-[#333] hover:text-[#888]'
              }`}
            >
              {AUTH_LABELS[level]}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-[#444]">
          Pivot: {auth.canPivot ? 'allowed' : 'blocked'} · Auto tier: {auth.canAutoTier ? 'on' : 'manual'}
        </p>
      </div>

      {/* Behaviour signals */}
      <div className="bg-[#111] border border-[#1f1f1f] rounded-md p-5 mb-4">
        <p className="text-[10px] tracking-[0.16em] uppercase text-[#444] font-medium mb-3">
          Behaviour Engine
        </p>
        <p className="text-[12px] text-[#888] font-light">
          {behaviour.completionCount} tasks completed · {behaviour.skipCount} skips tracked
          {behaviour.activeToday ? ' · active today' : ''}
        </p>
        <p className="text-[10px] text-[#444] mt-2">
          Skips and completions adjust the momentum factor in your Priority Engine.
        </p>
      </div>

      {/* Account info */}
      <div className="bg-[#111] border border-[#1f1f1f] rounded-md p-5 mb-4">
        <p className="text-[10px] tracking-[0.16em] uppercase text-[#444] font-medium mb-3">Account</p>
        <div className="space-y-2.5 text-[13px]">
          <div className="flex justify-between">
            <span className="text-[#444]">Member since</span>
            <span className="text-[#888] font-light">
              {profile?.created_at
                ? new Date(profile.created_at).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
                : '—'}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}
