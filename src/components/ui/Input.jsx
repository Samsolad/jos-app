export default function Input({
    label, error, type = 'text', className = '', ...props
  }) {
    return (
      <div className="mb-5">
        {label && (
          <label className="block text-[10px] tracking-[0.16em] uppercase text-[#888] font-medium mb-2">
            {label}
          </label>
        )}
        {type === 'textarea' ? (
          <textarea
            className={`w-full bg-[#111] border border-[#2a2a2a] rounded py-3 px-4 text-white text-sm font-light outline-none transition-colors focus:border-[#333] placeholder:text-[#444] resize-y min-h-[80px] ${className}`}
            {...props}
          />
        ) : (
          <input
            type={type}
            className={`w-full bg-[#111] border border-[#2a2a2a] rounded py-3 px-4 text-white text-sm font-light outline-none transition-colors focus:border-[#333] placeholder:text-[#444] ${className}`}
            {...props}
          />
        )}
        {error && <p className="text-[#ef4444] text-[11px] mt-1.5 font-light">{error}</p>}
      </div>
    )
  }