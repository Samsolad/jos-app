import { useEffect, useState } from 'react'
import useSocialStore from '../../store/socialStore'
import useAuthStore from '../../store/authStore'
import useProjectStore from '../../store/projectStore'
import useGoalStore from '../../store/goalStore'
import { askClaude } from '../../lib/claude'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'

const ALL_PLATFORMS = [
  { name: 'LinkedIn', icon: '💼', needsCopy: false, hasImage: false, color: '#0077b5', connectUrl: 'https://www.linkedin.com' },
  { name: 'Instagram', icon: '📸', needsCopy: true, hasImage: true, color: '#e1306c', connectUrl: 'https://www.instagram.com' },
  { name: 'X / Twitter', icon: '𝕏', needsCopy: true, hasImage: false, color: '#ffffff', connectUrl: 'https://twitter.com' },
  { name: 'TikTok', icon: '🎵', needsCopy: true, hasImage: true, color: '#ff0050', connectUrl: 'https://www.tiktok.com' },
  { name: 'YouTube', icon: '▶', needsCopy: true, hasImage: false, color: '#ff0000', connectUrl: 'https://studio.youtube.com' },
  { name: 'Facebook', icon: '🔵', needsCopy: false, hasImage: false, color: '#1877f2', connectUrl: 'https://www.facebook.com' },
  { name: 'Threads', icon: '🧵', needsCopy: true, hasImage: false, color: '#ffffff', connectUrl: 'https://www.threads.net' },
]

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
  const [tab, setTab] = useState('draft')
  const [copied, setCopied] = useState(false)
  const [generatingImage, setGeneratingImage] = useState(false)
  const [generatedImage, setGeneratedImage] = useState(null)

  useEffect(() => { fetchPosts() }, [])

  useEffect(() => {
    if (platforms.length > 0 && !activePlat) {
      setActivePlat(platforms[0].platform)
    }
  }, [platforms])

  const postedToday = getPostedToday()
  const activePlatInfo = ALL_PLATFORMS.find(p => p.name === activePlat)

  const handleDraft = async () => {
    if (!activePlat) return
    setDrafting(true)
    setDraft('')
    setSavedId(null)
    setGeneratedImage(null)

    const sys = `You are a social media strategist writing for ${profile?.name || 'a professional'}.
Role: ${profile?.role || 'founder'}. Location: ${profile?.location || 'UK'}.
About them: ${profile?.about || 'building their business'}.
Projects: ${projects.map(p => p.name).join(', ') || 'various'}.
Goals: ${goals.filter(g => !g.done).slice(0, 2).map(g => g.text).join('; ') || 'growing their business'}.
Platform: ${activePlat}.
${activePlat === 'LinkedIn' ? 'Write a professional LinkedIn post. 150-200 words. Thought leadership, founder insights, or project update. 3-5 hashtags. First-person voice.' : ''}
${activePlat === 'Instagram' ? 'Write a punchy Instagram caption. 80-120 words. Personal, visual-first, community. 5-8 hashtags. Emojis welcome.' : ''}
${activePlat === 'X / Twitter' ? 'Write a sharp tweet. Max 280 chars. Punchy, direct, no hashtag overload. Alternatively a 3-tweet thread opener.' : ''}
${activePlat === 'TikTok' ? 'Write a TikTok script. Hook (first 3 seconds), body, CTA. Conversational and relatable. Under 150 words total.' : ''}
${activePlat === 'YouTube' ? 'Write a YouTube video description. 100-150 words. SEO-friendly, includes key phrases, ends with CTA and relevant links placeholder.' : ''}
${activePlat === 'Facebook' ? 'Write an engaging Facebook post. 100-150 words. Community-focused, warm tone, ends with a question.' : ''}
${activePlat === 'Threads' ? 'Write a Threads post. Conversational, authentic, under 200 words. Like a tweet but more personal.' : ''}
Write in first person. Authentic, not corporate. Rotate themes: project update, personal insight, behind-the-scenes, community moment.`

    const reply = await askClaude(
      [{ role: 'user', content: `Write a ${activePlat} post for ${new Date().toDateString()}.` }],
      sys
    )

    setDraft(reply)
    setDrafting(false)
    const saved = await savePost(activePlat, reply, false)
    if (saved) setSavedId(saved.id)
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(draft)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleGenerateImage = async () => {
    if (!draft) return
    setGeneratingImage(true)
    setGeneratedImage(null)

    // Use Pollinations.ai — free, no API key needed
    const prompt = encodeURIComponent(
      `Professional social media image for ${activePlat}. Context: ${draft.slice(0, 100)}. Style: modern, clean, minimal. Person: ${profile?.name || 'entrepreneur'}, ${profile?.role || 'founder'}. No text overlay.`
    )
    const url = `https://image.pollinations.ai/prompt/${prompt}?width=1080&height=1080&nologo=true`
    setGeneratedImage(url)
    setGeneratingImage(false)
  }

  const handleMarkPosted = async () => {
    if (!savedId) {
      const saved = await savePost(activePlat, draft, true)
      if (saved) setSavedId(saved.id)
    } else {
      await markPosted(savedId)
    }
    setDraft('')
    setSavedId(null)
    setGeneratedImage(null)
  }

  const fd = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

  return (
    <div className="animate-fadeUp max-w-2xl">
      <p className="text-[10px] tracking-[0.2em] uppercase text-[#444] font-medium mb-2">Communications</p>
      <h1 className="font-serif text-[24px] sm:text-[26px] font-bold mb-1">
        Social <em className="text-[#e8e8e8]">Posting</em>
      </h1>
      <p className="text-[13px] text-[#888] font-light mb-6">
        AI-drafted posts personalised to your work and goals.
      </p>

      {/* No platforms */}
      {platforms.length === 0 && !loading && (
        <div className="bg-[#111] border border-[#1f1f1f] rounded-md p-5 mb-6">
          <p className="text-[13px] font-medium mb-1">No platforms set up.</p>
          <p className="text-[12px] text-[#888] font-light mb-4">Add your platforms to start drafting content daily.</p>
          <Button variant="solid" size="sm" onClick={() => setShowPlatManager(true)}>+ Add Platforms</Button>
        </div>
      )}

      {/* Platform manager */}
      {showPlatManager && (
        <div className="bg-[#111] border border-[#1f1f1f] rounded-md p-4 mb-6 animate-fadeUp">
          <div className="flex items-center justify-between mb-4">
            <p className="text-[10px] tracking-[0.16em] uppercase text-[#444] font-medium">Your Platforms</p>
            <Button variant="muted" size="xs" onClick={() => setShowPlatManager(false)}>Done</Button>
          </div>
          <div className="space-y-2">
            {ALL_PLATFORMS.map(p => {
              const active = platforms.find(pl => pl.platform === p.name)
              return (
                <div key={p.name} className={`flex items-center justify-between px-4 py-3 rounded-md border transition-all ${active ? 'border-white/20 bg-white/[0.04]' : 'border-[#2a2a2a]'}`}>
                  <div className="flex items-center gap-3">
                    <span className="text-[18px]">{p.icon}</span>
                    <div>
                      <p className="text-[13px] font-medium">{p.name}</p>
                      {p.needsCopy && (
                        <p className="text-[10px] text-[#444] mt-0.5">Copy & paste — direct API not available</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    
                      href={p.connectUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[10px] text-[#444] hover:text-[#888] underline"
                    >
                      Open ↗
                    </a>
                    <button
                      onClick={() => active ? removePlatform(active.id) : addPlatform(p.name)}
                      className={`px-3 py-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase rounded border transition-all ${
                        active
                          ? 'border-[#f87171]/30 text-[#f87171] hover:bg-[#ef444412]'
                          : 'border-white bg-white text-[#080808] hover:bg-[#e8e8e8]'
                      }`}
                    >
                      {active ? 'Remove' : 'Add'}
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
          <p className="text-[11px] text-[#444] font-light mt-4">
            Note: Direct posting requires platform API approval. Instagram, TikTok, X, Threads and YouTube use copy & paste. LinkedIn and Facebook support future direct integration.
          </p>
        </div>
      )}

      {platforms.length > 0 && (
        <>
          {/* Platform tabs */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {platforms.map(p => (
              <button
                key={p.id}
                onClick={() => { setActivePlat(p.platform); setDraft(''); setSavedId(null); setGeneratedImage(null) }}
                className={`px-3 sm:px-4 py-2 text-[11px] font-semibold tracking-[0.1em] uppercase rounded border transition-all ${
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

          {/* Copy notice for platforms that need it */}
          {activePlatInfo?.needsCopy && (
            <div className="mb-4 px-4 py-2.5 bg-[#f59e0b]/[0.06] border border-[#f59e0b]/20 rounded-md flex items-center justify-between gap-3">
              <p className="text-[12px] text-[#fbbf24] font-light">
                {activePlat} requires copy & paste. Draft your post, copy it, then open the app to post.
              </p>
              
                href={activePlatInfo.connectUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-[#fbbf24] underline whitespace-nowrap hover:text-[#fde68a] transition-colors"
              >
                Open {activePlat} ↗
              </a>
            </div>
          )}

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
                  {postedToday.includes(activePlat) && (
                    <span className="ml-2 text-[#4ade80]">· Posted today ✓</span>
                  )}
                </p>
                <Button variant="ghost" size="xs" onClick={handleDraft} disabled={drafting}>
                  {drafting ? '…' : '✦ AI Draft'}
                </Button>
              </div>

              {/* Drafting animation */}
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

              {/* Draft content */}
              {!drafting && draft && (
                <>
                  <textarea
                    className="w-full bg-[#181818] border border-[#2a2a2a] rounded py-3 px-4 text-white text-[13px] font-light outline-none focus:border-[#333] resize-y min-h-[160px] mb-4"
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                  />

                  {/* Action buttons */}
                  <div className="flex flex-wrap gap-2 mb-4">
                    {activePlatInfo?.needsCopy ? (
                      <Button variant="solid" size="sm" onClick={handleCopy}>
                        {copied ? '✓ Copied!' : '📋 Copy Post'}
                      </Button>
                    ) : (
                      <Button variant="green" size="sm" onClick={handleMarkPosted}>
                        ✓ Mark Posted
                      </Button>
                    )}
                    {activePlatInfo?.needsCopy && (
                      
                        href={activePlatInfo.connectUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        <Button variant="ghost" size="sm">Open {activePlat} ↗</Button>
                      </a>
                    )}
                    <Button variant="ghost" size="sm" onClick={handleDraft}>↻ Regenerate</Button>
                    {activePlatInfo?.needsCopy && draft && (
                      <Button variant="muted" size="sm" onClick={handleMarkPosted}>✓ Mark as Posted</Button>
                    )}
                  </div>

                  {/* Image generation for visual platforms */}
                  {activePlatInfo?.hasImage && (
                    <div className="border-t border-[#1f1f1f] pt-4">
                      <div className="flex items-center justify-between mb-3">
                        <p className="text-[10px] tracking-[0.14em] uppercase text-[#444] font-medium">
                          AI Image
                        </p>
                        <Button
                          variant="ghost"
                          size="xs"
                          onClick={handleGenerateImage}
                          disabled={generatingImage}
                        >
                          {generatingImage ? '…' : '🎨 Generate Image'}
                        </Button>
                      </div>

                      {generatingImage && (
                        <div className="h-40 bg-[#181818] border border-[#2a2a2a] rounded-md flex items-center justify-center">
                          <div className="text-center">
                            <div className="w-5 h-5 border-2 border-[#2a2a2a] border-t-white rounded-full animate-spin mx-auto mb-2" />
                            <p className="text-[12px] text-[#444] font-light">Generating image…</p>
                          </div>
                        </div>
                      )}

                      {generatedImage && (
                        <div className="space-y-3">
                          <img
                            src={generatedImage}
                            alt="Generated"
                            className="w-full max-w-sm rounded-md border border-[#2a2a2a]"
                            onError={() => setGeneratedImage(null)}
                          />
                          <div className="flex gap-2">
                            <a href={generatedImage} download target="_blank" rel="noreferrer">
                              <Button variant="ghost" size="xs">⬇ Download</Button>
                            </a>
                            <Button variant="muted" size="xs" onClick={handleGenerateImage}>
                              ↻ Regenerate
                            </Button>
                          </div>
                        </div>
                      )}

                      {!generatedImage && !generatingImage && (
                        <p className="text-[12px] text-[#444] font-light">
                          Generate a free AI image to go with your {activePlat} post.
                        </p>
                      )}
                    </div>
                  )}
                </>
              )}

              {/* Empty state */}
              {!drafting && !draft && (
                <div className="py-8 text-center">
                  <p className="text-[13px] text-[#444] font-light mb-4">
                    Generate a personalised {activePlat} post using your real projects and goals.
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
              {posts.filter(p => p.platform === activePlat).length === 0 && (
                <p className="text-[13px] text-[#444] font-light text-center py-8">No posts logged for {activePlat}.</p>
              )}
              <div className="space-y-2">
                {posts.filter(p => p.platform === activePlat).map(p => (
                  <div key={p.id} className="bg-[#111] border border-[#1f1f1f] rounded-md p-4">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <Badge color={p.posted ? 'green' : 'dim'}>{p.posted ? 'Posted' : 'Draft'}</Badge>
                        <span className="text-[10px] text-[#444]">{fd(p.posted_at)}</span>
                      </div>
                      <button onClick={() => deletePost(p.id)} className="text-[#2a2a2a] hover:text-[#444] text-[12px] transition-colors">✕</button>
                    </div>
                    <p className="text-[12px] text-[#888] font-light leading-relaxed line-clamp-3">{p.draft}</p>
                    <div className="flex gap-2 mt-2">
                      <button onClick={() => { setDraft(p.draft); setTab('draft'); setSavedId(p.id) }} className="text-[11px] text-[#888] hover:text-white transition-colors">Edit →</button>
                      {!p.posted && <button onClick={() => markPosted(p.id)} className="text-[11px] text-[#4ade80] hover:text-[#86efac] transition-colors">Mark posted →</button>}
                    </div>
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