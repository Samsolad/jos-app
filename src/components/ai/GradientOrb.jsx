const STATE_CLASS = {
  idle: '',
  listening: 'ai-orb--listening',
  thinking: 'ai-orb--thinking',
  responding: 'ai-orb--responding',
  complete: '',
}

export default function GradientOrb({ state = 'idle', size = 'md', className = '' }) {
  const sizes = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-14 h-14',
  }

  return (
    <div
      className={`ai-orb rounded-full flex-shrink-0 ${sizes[size] || sizes.md} ${STATE_CLASS[state] || ''} ${className}`}
      role="img"
      aria-label={`AI assistant — ${state}`}
    />
  )
}
