export default function Button({
    children, onClick, type = 'button', variant = 'solid',
    size = 'md', disabled = false, className = '', ...props
  }) {
    const base = 'font-semibold tracking-wider uppercase transition-all duration-150 rounded cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap'
  
    const sizes = {
      xs: 'px-3 py-1.5 text-[10px]',
      sm: 'px-4 py-2 text-[11px]',
      md: 'px-5 py-2.5 text-[11px]',
      lg: 'px-7 py-3 text-xs',
      full: 'w-full px-5 py-3.5 text-xs',
    }
  
    const variants = {
      solid: 'bg-white text-[#080808] border border-white hover:bg-[#e8e8e8]',
      ghost: 'bg-transparent text-white border border-[#2a2a2a] hover:border-[#333] hover:bg-[#181818]',
      muted: 'bg-transparent text-[#444] border border-[#1f1f1f] hover:border-[#2a2a2a] hover:text-[#888]',
      green: 'bg-transparent text-[#4ade80] border border-[#22c55e33] hover:bg-[#22c55e12]',
      red: 'bg-transparent text-[#f87171] border border-[#ef444433] hover:bg-[#ef444412]',
    }
  
    return (
      <button
        type={type}
        onClick={onClick}
        disabled={disabled}
        className={`${base} ${sizes[size]} ${variants[variant]} ${disabled ? 'opacity-35 cursor-not-allowed' : ''} ${className}`}
        {...props}
      >
        {children}
      </button>
    )
  }