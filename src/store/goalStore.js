import { create } from 'zustand'
import { supabase } from '../lib/supabase'

const useGoalStore = create((set, get) => ({
  goals: [],
  loading: false,

  fetchGoals: async () => {
    set({ loading: true })
    const { data } = await supabase
      .from('goals')
      .select(`*, goal_steps(*)`)
      .order('created_at', { ascending: false })
    set({ goals: data || [], loading: false })
  },

  addGoal: async (goalData) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null
    const { steps, ...rest } = goalData
    const { data: goal, error } = await supabase
      .from('goals')
      .insert({ ...rest, user_id: user.id })
      .select()
      .single()
    if (error || !goal) return null

    // Insert steps
    if (steps?.length) {
      const stepInserts = steps.map((s, i) => ({
        goal_id: goal.id,
        user_id: user.id,
        text: s.text,
        timeframe: s.timeframe || '',
        budget: s.budget || '',
        position: i,
      }))
      const { data: insertedSteps } = await supabase
        .from('goal_steps')
        .insert(stepInserts)
        .select()
      goal.goal_steps = insertedSteps || []
    } else {
      goal.goal_steps = []
    }

    set(s => ({ goals: [goal, ...s.goals] }))
    return goal
  },

  updateGoal: async (id, updates) => {
    const { data } = await supabase
      .from('goals')
      .update(updates)
      .eq('id', id)
      .select()
      .single()
    if (data) {
      set(s => ({
        goals: s.goals.map(g =>
          g.id === id ? { ...g, ...data } : g
        )
      }))
    }
    return data
  },

  deleteGoal: async (id) => {
    await supabase.from('goals').delete().eq('id', id)
    set(s => ({ goals: s.goals.filter(g => g.id !== id) }))
  },

  toggleGoalStep: async (goalId, stepId) => {
    const goal = get().goals.find(g => g.id === goalId)
    if (!goal) return
    const step = goal.goal_steps?.find(s => s.id === stepId)
    if (!step) return
    const { data } = await supabase
      .from('goal_steps')
      .update({ done: !step.done })
      .eq('id', stepId)
      .select()
      .single()
    if (data) {
      set(s => ({
        goals: s.goals.map(g =>
          g.id === goalId
            ? { ...g, goal_steps: g.goal_steps.map(st => st.id === stepId ? data : st) }
            : g
        )
      }))
    }
  },

  updateGoalSteps: async (goalId, steps) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    // Delete existing steps
    await supabase.from('goal_steps').delete().eq('goal_id', goalId)
    // Insert new steps
    if (steps.length) {
      const inserts = steps.map((s, i) => ({
        goal_id: goalId,
        user_id: user.id,
        text: s.text,
        timeframe: s.timeframe || '',
        budget: s.budget || '',
        position: i,
        done: s.done || false,
      }))
      const { data } = await supabase
        .from('goal_steps')
        .insert(inserts)
        .select()
      set(s => ({
        goals: s.goals.map(g =>
          g.id === goalId ? { ...g, goal_steps: data || [] } : g
        )
      }))
    } else {
      // Steps cleared — update local state to reflect empty array
      set(s => ({
        goals: s.goals.map(g =>
          g.id === goalId ? { ...g, goal_steps: [] } : g
        )
      }))
    }
  },
}))

export default useGoalStore