import { FACTOR_KEYS, FACTOR_LABELS } from '../lib/priorityEngine'

export default function PriorityFactors({ factors }) {
  if (!factors) return null

  return (
    <div className="mt-4 pt-4 border-t border-[#1f1f1f]">
      <p className="text-[10px] tracking-[0.16em] uppercase text-[#444] font-medium mb-2">
        Priority breakdown
      </p>
      <div className="space-y-2">
        {FACTOR_KEYS.map((key) => {
          const val = factors[key] ?? 0
          return (
            <div key={key} className="flex items-center gap-2">
              <span className="text-[10px] text-[#666] w-28 flex-shrink-0">{FACTOR_LABELS[key]}</span>
              <div className="flex-1 h-1.5 bg-[#1a1a1a] rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#888]"
                  style={{ width: `${val}%` }}
                />
              </div>
              <span className="text-[10px] text-[#444] w-6 text-right">{val}</span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
