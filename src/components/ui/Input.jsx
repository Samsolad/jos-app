import { useState } from 'react'

export default function Input({
  label,
  error,
  type = 'text',
  className = '',
  revealable = false,
  ...props
}) {
  const [revealed, setRevealed] = useState(false)
  const isPassword = type === 'password'
  const inputType = isPassword && revealable && revealed ? 'text' : type

  const inputClass = `w-full bg-jos-surface border border-jos-border rounded-lg py-3 text-jos-text text-sm outline-none transition-colors focus:border-jos-accent placeholder:text-jos-muted ${
    isPassword && revealable ? 'pl-4 pr-11' : 'px-4'
  } ${className}`

  return (
    <div className="mb-5">
      {label && <label className="jos-label block mb-2">{label}</label>}
      {type === 'textarea' ? (
        <textarea
          className={`w-full bg-jos-surface border border-jos-border rounded-lg py-3 px-4 text-jos-text text-sm outline-none transition-colors focus:border-jos-accent placeholder:text-jos-muted resize-y min-h-[80px] ${className}`}
          {...props}
        />
      ) : (
        <div className="relative">
          <input type={inputType} className={inputClass} {...props} />
          {isPassword && revealable && (
            <button
              type="button"
              onClick={() => setRevealed((v) => !v)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-jos-muted hover:text-jos-text text-[11px] font-medium tracking-wide"
              aria-label={revealed ? 'Hide password' : 'Show password'}
            >
              {revealed ? 'Hide' : 'Show'}
            </button>
          )}
        </div>
      )}
      {error && <p className="text-jos-error text-[11px] mt-1.5">{error}</p>}
    </div>
  )
}
