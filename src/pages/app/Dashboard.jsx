import useAuthStore from '../../store/authStore'

export default function Dashboard() {
  const profile = useAuthStore(s => s.profile)
  const firstName = profile?.name?.split(' ')[0] || 'there'
  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening'

  return (
    <div className="animate-[fadeUp_0.3s_ease]">
      <p className="text-[10px] tracking-[0.2em] uppercase text-[#444] font-medium mb-2">Command Hub</p>
      <h1 className="font-serif text-[26px] font-bold mb-1">
        Good {greeting}, <em className="text-[#e8e8e8]">{firstName}</em>.
      </h1>
      <p className="text-[13px] text-[#888] font-light mb-7">Here is everything across your OS.</p>

      <div className="h-px bg-[#1f1f1f] my-5" />

      <p className="text-[10px] tracking-[0.2em] uppercase text-[#444] font-medium mb-3">Status</p>
      <div className="bg-[#111] border border-[#1f1f1f] rounded-md p-5 text-[13px] text-[#888] font-light">
        Auth is working. Dashboard will be built out next with projects, goals, habits, and more.
      </div>
    </div>
  )
}