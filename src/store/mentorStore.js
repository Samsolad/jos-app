import { create } from 'zustand'
import { mentorMessage, pickPersonality, speak } from '../lib/mentor'

const useMentorStore = create((set, get) => ({
  message:   '',
  situation: 'pa',
  visible:   false,
  actions:   [],
  _timer:    null,

  show: (message, situation, actions) => {
    const sit = situation || 'pa'
    const acts = actions || []
    clearTimeout(get()._timer)
    const timer = setTimeout(() => set({ visible: false }), 18000)
    set({ message, situation: sit, visible: true, actions: acts, _timer: timer })
    speak(message, sit)
  },

  dismiss: () => {
    clearTimeout(get()._timer)
    if (window.speechSynthesis) window.speechSynthesis.cancel()
    set({ visible: false })
  },

  trigger: async (situationIn, context, profileIn, actionsIn) => {
    const ctx  = context   || {}
    const prof = profileIn || {}
    const acts = actionsIn || []
    const sit  = situationIn || 'pa'

    const personality = pickPersonality(sit)

    // For motivate — show immediate placeholder so sound fires in gesture tick
    if (sit === 'motivate') {
      const name = prof?.name?.split(' ')[0] || 'there'
      get().show(`On it, ${name}…`, personality, acts)
    }

    // Generate AI message
    const msg = await mentorMessage(sit, ctx, prof)
    if (!msg) return

    // Update with real message
    clearTimeout(get()._timer)
    const timer = setTimeout(() => set({ visible: false }), 18000)
    set({
      message:   msg,
      situation: personality,
      visible:   true,
      actions:   acts,
      _timer:    timer,
    })
    speak(msg, sit)
  },
}))

export default useMentorStore