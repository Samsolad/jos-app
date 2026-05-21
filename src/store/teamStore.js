import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { getTier } from '../lib/subscription'

const useTeamStore = create((set, get) => ({
  team: null,
  members: [],
  loading: false,

  canUseTeam: (profile) => {
    const tier = getTier(profile)
    return tier === 'team' || tier === 'operator'
  },

  fetchTeam: async () => {
    set({ loading: true })
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      set({ loading: false })
      return
    }

    const { data: owned } = await supabase
      .from('teams')
      .select('*')
      .eq('owner_id', user.id)
      .maybeSingle()

    if (owned) {
      const { data: members } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', owned.id)
      set({ team: owned, members: members || [], loading: false })
      return
    }

    const { data: membership } = await supabase
      .from('team_members')
      .select('team_id, role, teams(*)')
      .eq('user_id', user.id)
      .not('joined_at', 'is', null)
      .maybeSingle()

    if (membership?.teams) {
      const { data: members } = await supabase
        .from('team_members')
        .select('*')
        .eq('team_id', membership.team_id)
      set({ team: membership.teams, members: members || [], loading: false })
      return
    }

    set({ team: null, members: [], loading: false })
  },

  createTeam: async (name) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: team, error } = await supabase
      .from('teams')
      .insert({ name, owner_id: user.id })
      .select()
      .single()

    if (error || !team) return null

    await supabase.from('team_members').insert({
      team_id: team.id,
      user_id: user.id,
      email: user.email,
      role: 'owner',
      joined_at: new Date().toISOString(),
    })

    await get().fetchTeam()
    return team
  },

  inviteMember: async (email, role = 'member') => {
    const team = get().team
    if (!team) return null

    const { data, error } = await supabase
      .from('team_members')
      .insert({
        team_id: team.id,
        email: email.trim().toLowerCase(),
        role,
      })
      .select()
      .single()

    if (!error && data) {
      set((s) => ({ members: [...s.members, data] }))
    }
    return data
  },

  removeMember: async (memberId) => {
    await supabase.from('team_members').delete().eq('id', memberId)
    set((s) => ({ members: s.members.filter((m) => m.id !== memberId) }))
  },
}))

export default useTeamStore
