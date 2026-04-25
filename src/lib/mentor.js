import { askClaude } from './claude'

// iOS requires audio to be unlocked by a user gesture first
let audioUnlocked = false

export function unlockAudio() {
  if (audioUnlocked) return
  if (!window.speechSynthesis) return
  const u = new SpeechSynthesisUtterance('')
  u.volume = 0
  window.speechSynthesis.speak(u)
  audioUnlocked = true
}

// ── PERSONALITIES ─────────────────────────────────────────────────
const TONES = {
  tough: `You are a tough-love accountability coach. Direct, no fluff. Call them out. Max 2 sentences. No cruelty but no sugarcoating either.`,
  warm:  `You are a warm encouraging mentor who genuinely cares. Celebrate this win sincerely. Max 2 sentences. Personal and specific.`,
  hype:  `You are an energetic hype coach. Get them fired up. Punchy. Max 2 sentences. High energy but not cringe.`,
  wise:  `You are a calm wise advisor. One sharp insight or reframe. Max 2 sentences. Thoughtful and measured.`,
  pa:    `You are a sharp personal assistant. Brief, clear, direct. Max 2 sentences.`,
}

// Pick personality based on situation
export function pickPersonality(situation) {
  if (['idle', 'slack', 'no_activity', 'missed'].includes(situation)) return 'tough'
  if (['win', 'complete', 'celebrate', 'done'].includes(situation))   return 'warm'
  if (['next', 'push', 'motivate', 'start'].includes(situation))      return 'hype'
  if (['advice', 'deadline', 'strategy', 'wise'].includes(situation)) return 'wise'
  return 'pa'
}

// ── SPEAK ─────────────────────────────────────────────────────────
export function speak(msg, situation = 'pa') {
  if (!msg) return
  if (!window.speechSynthesis) return

  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(msg)

  // Voice varies by personality
  if (situation === 'idle' || situation === 'tough') {
    u.rate = 0.88; u.pitch = 0.75
  } else if (situation === 'celebrate' || situation === 'warm') {
    u.rate = 1.0; u.pitch = 1.05
  } else if (situation === 'hype' || situation === 'push') {
    u.rate = 1.08; u.pitch = 1.0
  } else {
    u.rate = 0.93; u.pitch = 0.85
  }

  u.volume = 1

  // Prefer a UK English voice
  const voices = window.speechSynthesis.getVoices()
  const preferred = voices.find(v =>
    /google uk|daniel|arthur|aaron/i.test(v.name)
  )
  if (preferred) u.voice = preferred

  window.speechSynthesis.speak(u)
}

// ── GENERATE MENTOR MESSAGE ───────────────────────────────────────
export async function mentorMessage(situation, context = {}, profile = {}) {
  const personality = pickPersonality(situation)
  const sys = TONES[personality]
  const name = profile?.name?.split(' ')[0] || 'there'

  let prompt = ''

  if (situation === 'next_task') {
    prompt = `${name} just completed a task. Their next task is: "${context.task}" on project "${context.project}". Tell them what is next and push them to start it immediately.`
  } else if (situation === 'idle') {
    prompt = `${name} has been idle for ${context.minutes} minutes. Their current task is: "${context.task || 'nothing specific'}". Call them out and get them back on track.`
  } else if (situation === 'no_activity') {
    prompt = `${name} has done nothing today on their projects: ${context.projects || 'various'}. It is ${context.hour < 17 ? 'still the afternoon — there is time' : 'getting late'}. Give them a reality check and a push.`
  } else if (situation === 'deadline') {
    prompt = `${name}'s "${context.item}" is due in ${context.days} day${context.days === 1 ? '' : 's'}. Give them a sharp reminder of what is at stake.`
  } else if (situation === 'celebrate') {
    prompt = `${name} just completed "${context.item}". Celebrate this win genuinely and briefly.`
  } else if (situation === 'motivate') {
    prompt = `${name} needs motivation. Role: ${profile?.role || 'professional'}. Projects: ${context.projects || 'various'}. Give them a short personally relevant burst of motivation.`
  } else if (situation === 'eod') {
    prompt = `End of day for ${name}. Tasks completed: ${context.done}. Still pending: ${context.pending}. Give an honest warm end-of-day reflection and set the tone for tomorrow.`
  } else {
    prompt = `Say something useful to ${name} as their personal PA. Context: ${JSON.stringify(context)}`
  }

  const reply = await askClaude(
    [{ role: 'user', content: prompt }],
    sys,
  )

  return reply?.replace(/\*\*(.*?)\*\*/g, '$1').replace(/\n/g, ' ').trim() || ''
}