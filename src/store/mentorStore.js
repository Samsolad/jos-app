import { create } from 'zustand'
import { mentorMessage, pickPersonality } from '../lib/mentor'

const useMentorStore = create((set, get) => ({
  message:   '',
  situation: 'pa',
  visible:   false,
  actions:   [],

  // Show a message
  show: (message, situation = 'pa', actions = []) => {
    set({ message, situation, visible: true, actions })
    // Auto-dismiss after 18 seconds
    clearTimeout(get()._timer)
    const timer = setTimeout(() => set({ visible: false }), 18000)
    set({ _timer: timer })
  },

  dismiss: () => {
    clearTimeout(get()._timer)
    set({ visible: false })
  },

  // Generate and show a mentor message
  trigger: async (situation, context = {}, profile = {}, actions = []) => {
    const msg = await mentorMessage(situation, context, profile)
    if (msg) get().show(msg, pickPersonality(situation), actions)
  },
}))

export default useMentorStore