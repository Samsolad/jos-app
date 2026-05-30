import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { createPlanFromIdea } from '../lib/planTemplates'
import { replanSteps } from '../lib/planReplan'

const usePlanStore = create((set, get) => ({
  plan: null,
  loading: false,
  saving: false,
  error: null,

  fetchPlan: async () => {
    set({ loading: true, error: null })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      set({ loading: false, plan: null })
      return null
    }

    const { data, error } = await supabase
      .from('product_plans')
      .select('*')
      .eq('user_id', user.id)
      .maybeSingle()

    if (error?.code === '42P01' || error?.message?.includes('does not exist')) {
      set({ loading: false, plan: null, error: 'Run migration 006_product_plan.sql in Supabase.' })
      return null
    }

    set({ plan: data || null, loading: false, error: error?.message || null })
    return data
  },

  createPlan: async (idea) => {
    const trimmed = idea.trim()
    if (!trimmed) throw new Error('Describe your idea first.')

    set({ saving: true, error: null })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) throw new Error('Sign in to save your plan.')

    const payload = createPlanFromIdea(trimmed)
    const { data, error } = await supabase
      .from('product_plans')
      .upsert({
        user_id: user.id,
        idea: payload.idea,
        build_steps: payload.build_steps,
        market_steps: payload.market_steps,
        adjustments: [],
        updated_at: new Date().toISOString(),
      }, { onConflict: 'user_id' })
      .select()
      .single()

    set({ plan: data, saving: false, error: error?.message || null })
    if (error) throw new Error(error.message)
    return data
  },

  toggleStep: async (phase, stepId) => {
    const plan = get().plan
    if (!plan) return

    const key = phase === 'market' ? 'market_steps' : 'build_steps'
    const steps = plan[key].map((s) =>
      s.id === stepId ? { ...s, done: !s.done } : s,
    )

    set({ plan: { ...plan, [key]: steps }, saving: true })
    const { data, error } = await supabase
      .from('product_plans')
      .update({ [key]: steps, updated_at: new Date().toISOString() })
      .eq('id', plan.id)
      .select()
      .single()

    set({ plan: data || get().plan, saving: false, error: error?.message || null })
  },

  replan: async (changeDescription) => {
    const plan = get().plan
    if (!plan) return
    if (!changeDescription.trim()) throw new Error('Describe what changed.')

    set({ saving: true, error: null })
    const updated = await replanSteps(plan, changeDescription)

    const { data, error } = await supabase
      .from('product_plans')
      .update({
        build_steps: updated.build_steps,
        market_steps: updated.market_steps,
        adjustments: updated.adjustments,
        updated_at: new Date().toISOString(),
      })
      .eq('id', plan.id)
      .select()
      .single()

    set({ plan: data || updated, saving: false, error: error?.message || null })
    if (error) throw new Error(error.message)
    return data
  },

  resetPlan: async () => {
    const plan = get().plan
    if (!plan) return
    set({ saving: true })
    await supabase.from('product_plans').delete().eq('id', plan.id)
    set({ plan: null, saving: false })
  },
}))

export default usePlanStore
