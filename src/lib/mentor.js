import { askClaude } from './claude'

// ── PERSONALITIES ─────────────────────────────────────────────────
const TONES = {
  tough: `You are a tough-love accountability coach. Direct, no fluff. Call them out. Max 2 sentences. No cruelty but no sugarcoating.`,
  warm:  `You are a warm encouraging mentor who genuinely cares. Celebrate this win sincerely. Max 2 sentences. Personal and specific.`,
  hype:  `You are an energetic hype coach. Get them fired up. Punchy. Max 2 sentences. High energy but not cringe.`,
  wise:  `You are a calm wise advisor. One sharp insight or reframe. Max 2 sentences. Thoughtful and measured.`,
  pa:    `You are a sharp personal assistant. Brief, clear, direct. Max 2 sentences.`,
}

// ── PICK PERSONALITY ──────────────────────────────────────────────
export function pickPersonality(sit) {
  if (!sit) return 'pa'
  if (['idle', 'slack', 'no_activity', 'missed'].includes(sit)) return 'tough'
  if (['win', 'complete', 'celebrate', 'done'].includes(sit))   return 'warm'
  if (['next', 'push', 'motivate', 'start', 'next_task'].includes(sit)) return 'hype'
  if (['advice', 'deadline', 'strategy', 'wise', 'eod'].includes(sit))  return 'wise'
  return 'pa'
}

// ── SPEAK ─────────────────────────────────────────────────────────
export function speak(msg, sit) {
  if (!msg) return
  if (typeof window === 'undefined') return
  if (!window.speechSynthesis) return

  const safeSit = sit || 'pa'

  window.speechSynthesis.cancel()

  setTimeout(() => {
    const u = new SpeechSynthesisUtterance(msg)

    if (safeSit === 'idle' || safeSit === 'tough') {
      u.rate = 0.88; u.pitch = 0.75
    } else if (safeSit === 'celebrate' || safeSit === 'warm') {
      u.rate = 1.0;  u.pitch = 1.05
    } else if (['hype', 'push', 'motivate', 'next_task'].includes(safeSit)) {
      u.rate = 1.08; u.pitch = 1.0
    } else {
      u.rate = 0.93; u.pitch = 0.85
    }

    u.volume = 1
    u.lang   = 'en-GB'

    if (window.speechSynthesis.getVoices) {
      const voices    = window.speechSynthesis.getVoices()
      const preferred = voices.find(v =>
        /daniel|arthur|aaron|google uk/i.test(v.name)
      )
      if (preferred) u.voice = preferred
    }

    window.speechSynthesis.speak(u)
  }, 100)
}

// ── GENERATE MENTOR MESSAGE ───────────────────────────────────────
export async function mentorMessage(sit, context, profile) {
  const safeSit  = sit      || 'pa'
  const ctx      = context  || {}
  const prof     = profile  || {}

  const personality = pickPersonality(safeSit)
  const sys         = TONES[personality] || TONES.pa
  const name        = prof?.name?.split(' ')[0] || 'there'

  let prompt = ''

  if (safeSit === 'next_task') {
    prompt = `${name} just completed a task. Their next task is: "${ctx.task || 'unknown'}" on project "${ctx.project || 'unknown'}". Tell them what is next and push them to start immediately.`
  } else if (safeSit === 'idle') {
    prompt = `${name} has been idle for ${ctx.minutes || 20} minutes. Their current task is: "${ctx.task || 'nothing specific'}". Call them out and get them back on track.`
  } else if (safeSit === 'no_activity') {
    prompt = `${name} has done nothing today on their projects: ${ctx.projects || 'various'}. It is ${(ctx.hour || 14) < 17 ? 'still the afternoon' : 'getting late'}. Give them a reality check and a push.`
  } else if (safeSit === 'deadline') {
    prompt = `${name}'s goal "${ctx.item || 'a goal'}" is due in ${ctx.days || 1} day${ctx.days === 1 ? '' : 's'}. Give them a sharp reminder of what is at stake.`
  } else if (safeSit === 'celebrate') {
    prompt = `${name} just completed "${ctx.item || 'a goal'}". Celebrate this win genuinely and briefly.`
  } else if (safeSit === 'motivate') {
    prompt = `${name} needs motivation. Role: ${prof?.role || 'professional'}. Projects: ${ctx.projects || 'various'}. Give them a short personally relevant burst of motivation.`
  } else if (safeSit === 'eod') {
    prompt = `End of day for ${name}. Tasks completed: ${ctx.done || 0}. Still pending: ${ctx.pending || 0}. Give an honest warm end-of-day reflection and set the tone for tomorrow.`
  } else {
    prompt = `Give ${name} a brief useful message as their personal PA.`
  }

  try {
    const reply = await askClaude(
      [{ role: 'user', content: prompt }],
      sys,
    )
    return reply?.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\n/g, ' ').trim() || ''
  } catch {
    return ''
  }
}