export default function Input({
  label,
  error,
  type = 'text',
  className = '',
  ...props
}) {
  return (
    <div className="mb-5">
      {label && <label className="jos-label block mb-2">{label}</label>}
      {type === 'textarea' ? (
        <textarea
          className={`w-full bg-jos-surface border border-jos-border rounded-lg py-3 px-4 text-jos-text text-sm outline-none transition-colors focus:border-jos-accent placeholder:text-jos-muted resize-y min-h-[80px] ${className}`}
          {...props}
        />
      ) : (
        <input
          type={type}
          className={`w-full bg-jos-surface border border-jos-border rounded-lg py-3 px-4 text-jos-text text-sm outline-none transition-colors focus:border-jos-accent placeholder:text-jos-muted ${className}`}
          {...props}
        />
      )}
      {error && <p className="text-jos-error text-[11px] mt-1.5">{error}</p>}
    </div>
  )
}
