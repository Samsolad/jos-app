import GradientOrb from './GradientOrb'

export default function MessageBubble({
  role,
  content,
  showOrb = true,
  actions,
  confidence,
}) {
  const isUser = role === 'user'

  return (
    <div
      className={`flex gap-3 mb-4 ${isUser ? 'justify-end' : 'justify-start'}`}
    >
      {!isUser && showOrb && (
        <GradientOrb state="complete" size="sm" className="mt-1 hidden sm:block" />
      )}
      <div className={`max-w-[85%] sm:max-w-[75%] ${isUser ? 'order-1' : ''}`}>
        <div
          className={`px-4 py-3 rounded-2xl text-[15px] leading-relaxed whitespace-pre-wrap ${
            isUser ? 'ai-bubble-user rounded-br-md' : 'ai-bubble-assistant rounded-bl-md'
          }`}
        >
          {content.replace(/\*\*(.*?)\*\*/g, '$1')}
        </div>
        {!isUser && confidence != null && (
          <p className="text-[11px] text-jos-muted mt-1 px-1">
            {confidence >= 0.8 ? `${Math.round(confidence * 100)}% confident` : 'Uncertain — verify important facts'}
          </p>
        )}
        {!isUser && actions && (
          <div className="flex flex-wrap gap-2 mt-2 px-1">{actions}</div>
        )}
      </div>
    </div>
  )
}
