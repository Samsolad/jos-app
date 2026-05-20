export default function Button({
  children,
  onClick,
  type = 'button',
  variant = 'solid',
  size = 'md',
  disabled = false,
  className = '',
  ...props
}) {
  const base =
    'font-semibold tracking-wide transition-all duration-150 rounded-lg cursor-pointer inline-flex items-center justify-center gap-2 whitespace-nowrap'

  const sizes = {
    xs: 'px-3 py-1.5 text-[10px]',
    sm: 'px-4 py-2 text-[11px]',
    md: 'px-5 py-2.5 text-[12px]',
    lg: 'px-7 py-3 text-[13px]',
    full: 'w-full px-5 py-3.5 text-[13px]',
  }

  const variants = {
    solid:
      'bg-jos-gradient text-white border border-transparent hover:shadow-glow ai-btn-glow',
    ghost:
      'bg-transparent text-jos-text border border-jos-border hover:border-jos-accent hover:bg-jos-surface-2',
    muted:
      'bg-transparent text-jos-muted border border-jos-border hover:border-jos-accent hover:text-jos-text',
    green:
      'bg-transparent text-jos-success border border-jos-success/30 hover:bg-jos-success/10',
    red:
      'bg-transparent text-jos-error border border-jos-error/30 hover:bg-jos-error/10',
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
