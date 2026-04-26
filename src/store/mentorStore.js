import { create } from 'zustand'
import { mentorMessage, pickPersonality, speak } from '../lib/mentor'

const useMentorStore = create((set, get) => ({
  message:   '',
  situation: 'pa',
  visible:   false,
  actions:   [],
  _timer:    null,

  show: (message, situation = 'pa', actions = []) => {
    clearTimeout(get()._timer)
    const timer = setTimeout(() => set({ visible: false }), 18000)
    set({ message, situation, visible: true, actions, _timer: timer })
    // Speak immediately — must be called in same tick as user gesture where possible
    speak(message, situation)
  },

  dismiss: () => {
    clearTimeout(get()._timer)
    window.speechSynthesis?.cancel()
    set({ visible: false })
  },

  // Show instantly with a thinking message, then update with AI response
  trigger: async (situation, context = {}, profile = {}, actions = []) => {
    const personality = pickPersonality(situation)

    // Show immediately so voice fires in the gesture tick
    const thinking = situation === 'motivate'
      ? `Give me a moment, ${profile?.name?.split(' ')[0] || 'there'}…`
      : null

    if (thinking) {
      get().show(thinking, personality, actions)
    }

    // Generate real message
    const msg = await mentorMessage(situation, context, profile)
    if (!msg) return

    // Update banner with real message and speak again
    clearTimeout(get()._timer)
    const timer = setTimeout(() => set({ visible: false }), 18000)
    set({ message: msg, situation: personality, visible: true, actions, _timer: timer })
    speak(msg, situation)
  },
}))

export default useMentorStore