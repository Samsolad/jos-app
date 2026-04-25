import { useEffect, useState } from 'react'
import useSocialStore from '../../store/socialStore'
import useAuthStore from '../../store/authStore'
import useProjectStore from '../../store/projectStore'
import useGoalStore from '../../store/goalStore'
import { askClaude } from '../../lib/claude'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'

const ALL_PLATFORMS = ['LinkedIn', 'Instagram', 'X / Twitter', 'TikTok', 'YouTube', 'Facebook', 'Threads']

export default function Social() {
  const { posts, platforms, loading, fetchPosts, addPlatform, removePlatform, savePost, markPosted, deletePost, getPostedToday } = useSocialStore()
  const profile = useAuthStore(s => s.profile)
  const { projects } = useProjectStore()
  const { goals } = useGoalStore()

  const [activePlat, setActivePlat] = useState('')
  const [draft, setDraft] = useState('')
  const [drafting, setDrafting] = useState(false)
  const [savedId, setSavedId] = useState(null)
  const [showPlatManager, setShowPlatManager] = useState(false)
  const [tab, setTab] = useState('draft') // draft | history

  useEffect(() => {
    fetchPosts()
  }, [])

  useEffect(() => {
    if (platforms.length > 0 && !activePlat) {
      setActivePlat(platforms[0].platform)
    }
  }, [platforms])

  const postedToday = getPostedToday()

  const handleDraft = async () => {
    if (!activePlat) return
    setDrafting(true)
    setDraft('')
    setSavedId(null)

    const sys = `You are a social media strategist writing for ${profile?.name || 'a professional'}.
Role: ${profile?.role || 'founder'}. Location: ${profile?.location || 'UK'}.
Projects: ${projects.map(p => p.name).join(', ') || 'various projects'}.
Goals: ${goals.filter(g => !g.done).slice(0, 2).map(g => g.text).join('; ') || 'building their business'}.
Platform: ${activePlat}.
${activePlat === 'LinkedIn' ? 'Write a professional LinkedIn post. 150-200 words. Thought leadership, founder insights, or project update. 3-5 relevant hashtags. No emoji overload.' : ''}
${activePlat === 'Instagram' ? 'Write a punchy Instagram caption. 80-120 words. Visual-first, personal, community-driven. 5-8 hashtags.' : ''}
${activePlat === 'X / Twitter' ? 'Write a sharp tweet or thread opener. Max 280 characters for single tweet, or 3-5 tweet thread. Concise and punchy.' : ''}
${activePlat === 'TikTok' ? 'Write a TikTok video script hook and caption. Hook in first 3 seconds. Conversational, relatable. 3-5 hashtags.' : ''}
${!['LinkedIn','Instagram','X / Twitter','TikTok'].includes(activePlat) ? `Write an engaging ${activePlat} post. Authentic voice, relevant to their work and goals.` : ''}
Rotate themes: project update, personal insight, behind-the-scenes, community. Write in first person. Authentic, not corporate.`

    const reply = await askClaude(
      [{ role: 'user', content: `Write a ${activePlat} post for today ${new Date().toDateString()}.` }],
      sys
    )

    setDraft(reply)
    setDrafting(false)

    // Auto-save draft
    const saved = await savePost(activePlat, reply, false)
    if (saved) setSavedId(saved.id)
  }

  const handleMarkPosted = async () => {
    if (!savedId) {
      // Save first if not already saved
      const saved = await savePost(activePlat, draft, true)
      if (saved) setSavedId(saved.id)
    } else {
      await markPosted(savedId)
    }
    setDraft('')
    setSavedId(null)
  }

  const todayPosts = posts.filter(p => {
    const today = new Date().toISOString().split('T')[0]
    return p.posted_at?.startsWith(today)
  })

  const fd = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })

  return (
    <div className="animate-fadeUp max-w-2xl">
      <p className="text-[10px] tracking-[0.2em] uppercase text-[#444] font-medium mb-2">Communications</p>
      <h1 className="font-serif text-[24px] sm:text-[26px] font-bold mb-1">
        Social <em className="text-[#e8e8e8]">Posting</em>
      </h1>
      <p className="text-[13px] text-[#888] font-light mb-6">
        AI-drafted posts personalised to your work and goals.
      </p>

      {/* No platforms set */}
      {platforms.length === 0 && !loading && (
        <div className="bg-[#111] border border-[#1f1f1f] rounded-md p-5 mb-6">
          <p className="text-[13px] font-medium mb-1">No platforms set up yet.</p>
          <p className="text-[12px] text-[#888] font-light mb-4">Add the platforms you post on and J·OS will draft content for each one daily.</p>
          <Button variant="solid" size="sm" onClick={() => setShowPlatManager(true)}>
            + Add Platforms
          </Button>
        </div>
      )}

      {/* Platform manager */}
      {showPlatManager && (
        <div className="bg-[#111] border border-[#1f1f1f] rounded-md p-4 mb-6 animate-fadeUp">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] tracking-[0.16em] uppercase text-[#444] font-medium">Your Platforms</p>
            <Button variant="muted" size="xs" onClick={() => setShowPlatManager(false)}>Done</Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {ALL_PLATFORMS.map(p => {
              const active = platforms.find(pl => pl.platform === p)
              return (
                <button
                  key={p}
                  onClick={() => active ? removePlatform(active.id) : addPlatform(p)}
                  className={`px-3 py-2.5 rounded text-[12px] font-medium text-left transition-all border ${
                    active
                      ? 'bg-white/[0.08] border-white/20 text-white'
                      : 'bg-transparent border-[#2a2a2a] text-[#444] hover:border-[#333] hover:text-[#888]'
                  }`}
                >
                  {active ? '✓ ' : '+ '}{p}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {platforms.length > 0 && (
        <>
          {/* Platform tabs */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {platforms.map(p => (
              <button
                key={p.id}
                onClick={() => { setActivePlat(p.platform); setDraft(''); setSavedId(null) }}
                className={`px-4 py-2 text-[11px] font-semibold tracking-[0.1em] uppercase rounded border transition-all ${
                  activePlat === p.platform
                    ? 'bg-white text-[#080808] border-white'
                    : 'bg-transparent text-[#444] border-[#2a2a2a] hover:border-[#333] hover:text-[#888]'
                }`}
              >
                {postedToday.includes(p.platform) ? '✓ ' : ''}{p.platform}
              </button>
            ))}
            <button
              onClick={() => setShowPlatManager(true)}
              className="px-3 py-2 text-[10px] text-[#444] border border-dashed border-[#2a2a2a] rounded hover:border-[#333] hover:text-[#888] transition-all"
            >
              + Edit
            </button>
          </div>

          {/* Tabs */}
          <div className="flex gap-1 mb-4">
            {['draft', 'history'].map(t => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={`px-4 py-1.5 text-[11px] font-semibold tracking-[0.1em] uppercase rounded transition-colors ${
                  tab === t ? 'text-white bg-[#181818]' : 'text-[#444] hover:text-[#888]'
                }`}
              >
                {t === 'draft' ? 'Draft' : 'History'}
              </button>
            ))}
          </div>

          {/* Draft tab */}
          {tab === 'draft' && (
            <div className="bg-[#111] border border-[#1f1f1f] rounded-md p-4 sm:p-5">
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] tracking-[0.16em] uppercase text-[#444] font-medium">
                  {activePlat} Draft
                  {postedToday.includes(activePlat) && <span className="ml-2 text-[#4ade80]">· Posted today ✓</span>}
                </p>
                <Button variant="ghost" size="xs" onClick={handleDraft} disabled={drafting}>
                  {drafting ? '…' : '✦ AI Draft'}
                </Button>
              </div>

              {drafting && (
                <div className="flex items-center gap-3 py-6">
                  <div className="flex gap-1.5">
                    {[0, 0.15, 0.3].map((d, i) => (
                      <div key={i} className="w-1.5 h-1.5 rounded-full bg-[#444] animate-bounce" style={{ animationDelay: `${d}s` }} />
                    ))}
                  </div>
                  <p className="text-[12px] text-[#444] font-light">Drafting for {activePlat}…</p>
                </div>
              )}

              {!drafting && draft && (
                <>
                  <textarea
                    className="w-full bg-[#181818] border border-[#2a2a2a] rounded py-3 px-4 text-white text-[13px] font-light outline-none focus:border-[#333] resize-y min-h-[160px] mb-4"
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                  />
                  <div className="flex gap-2 flex-wrap">
                    <Button variant="green" size="sm" onClick={handleMarkPosted}>✓ Mark Posted</Button>
                    <Button variant="ghost" size="sm" onClick={handleDraft}>↻ Regenerate</Button>
                  </div>
                </>
              )}

              {!drafting && !draft && (
                <div className="py-8 text-center">
                  <p className="text-[13px] text-[#444] font-light mb-4">
                    Click AI Draft to generate a personalised {activePlat} post.
                  </p>
                  <Button variant="solid" size="md" onClick={handleDraft}>
                    ✦ Generate {activePlat} Post
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* History tab */}
          {tab === 'history' && (
            <div>
              {posts.length === 0 && (
                <p className="text-[13px] text-[#444] font-light text-center py-8">No posts logged yet.</p>
              )}
              <div className="space-y-2">
                {posts.filter(p => p.platform === activePlat).map(p => (
                  <div key={p.id} className="bg-[#111] border border-[#1f1f1f] rounded-md p-4">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2">
                        <Badge color={p.posted ? 'green' : 'dim'}>{p.posted ? 'Posted' : 'Draft'}</Badge>
                        <span className="text-[10px] text-[#444]">{fd(p.posted_at)}</span>
                      </div>
                      <button onClick={() => deletePost(p.id)} className="text-[#2a2a2a] hover:text-[#444] text-[12px] transition-colors">✕</button>
                    </div>
                    <p className="text-[12px] text-[#888] font-light leading-relaxed line-clamp-3">{p.draft}</p>
                    {!p.posted && (
                      <button onClick={() => markPosted(p.id)} className="text-[11px] text-[#4ade80] mt-2 hover:text-[#86efac] transition-colors">Mark as posted →</button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}