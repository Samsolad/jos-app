const COLORS = {
    white: 'bg-white/[0.08] text-[#e8e8e8] border-white/[0.12]',
    green: 'bg-[#22c55e]/10 text-[#4ade80] border-[#22c55e]/[0.18]',
    red: 'bg-[#ef4444]/10 text-[#f87171] border-[#ef4444]/[0.18]',
    amber: 'bg-[#f59e0b]/10 text-[#fbbf24] border-[#f59e0b]/[0.18]',
    blue: 'bg-[#3b82f6]/10 text-[#60a5fa] border-[#3b82f6]/[0.18]',
    dim: 'bg-white/[0.04] text-[#444] border-[#2a2a2a]',
  }
  
  export default function Badge({ children, color = 'dim', className = '' }) {
    return (
      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 text-[9px] font-bold tracking-[0.1em] uppercase border rounded-sm ${COLORS[color]} ${className}`}>
        {children}
      </span>
    )
  }