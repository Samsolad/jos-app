import { create } from 'zustand'

const useNavigatorStore = create((set) => ({
  session: null,
  status: 'idle',
  error: null,

  startReview: (payload) =>
    set({
      session: payload,
      status: 'review',
      error: null,
    }),

  updateProposal: (proposal) =>
    set((s) => ({
      session: s.session ? { ...s.session, proposal } : null,
    })),

  setStatus: (status) => set({ status }),
  setError: (error) => set({ error }),
  clear: () => set({ session: null, status: 'idle', error: null }),
}))

export default useNavigatorStore
