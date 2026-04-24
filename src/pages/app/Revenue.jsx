import { useEffect, useState } from 'react'
import useRevenueStore from '../../store/revenueStore'
import useAuthStore from '../../store/authStore'
import Button from '../../components/ui/Button'

export default function Revenue() {
  const { entries, loading, fetchEntries, addEntry, deleteEntry, getTotals } = useRevenueStore()
  const profile = useAuthStore(s => s.profile)
  const [source, setSource] = useState('')
  const [amount, setAmount] = useState('')
  const [type, setType] = useState('in')
  const [showAdd, setShowAdd] = useState(false)

  const cur = profile?.currency || '£'

  useEffect(() => { fetchEntries() }, [])

  const handleAdd = async () => {
    if (!source.trim() || !amount) return
    await addEntry(source.trim(), amount, type)
    setSource('')
    setAmount('')
    setType('in')
    setShowAdd(false)
  }

  const { inn, out, net } = getTotals(entries)

  const fmt = (n) => `${cur}${Number(n).toLocaleString('en-GB', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}`

  const fd = (iso) => new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })

  return (
    <div className="animate-fadeUp max-w-xl">
      <p className="text-[10px] tracking-[0.2em] uppercase text-[#444] font-medium mb-2">Finance</p>
      <h1 className="font-serif text-[24px] sm:text-[26px] font-bold mb-6">
        Revenue & <em className="text-[#e8e8e8]">Budget</em>
      </h1>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-2 mb-6">
        {[
          { label: 'Total In', value: fmt(inn), color: '#4ade80' },
          { label: 'Total Out', value: fmt(out), color: '#f87171' },
          { label: 'Net', value: fmt(net), color: net >= 0 ? '#4ade80' : '#f87171' },
        ].map(s => (
          <div key={s.label} className="bg-[#111] border border-[#1f1f1f] rounded-md p-3 sm:p-4 text-center">
            <p className="text-[9px] sm:text-[10px] tracking-[0.14em] uppercase text-[#444] font-medium mb-2">{s.label}</p>
            <p className="font-serif text-[18px] sm:text-[22px] font-bold leading-none" style={{ color: s.color }}>
              {s.value}
            </p>
          </div>
        ))}
      </div>

      {/* Add entry */}
      {!showAdd ? (
        <Button variant="ghost" size="sm" onClick={() => setShowAdd(true)} className="mb-5">
          + Log Entry
        </Button>
      ) : (
        <div className="bg-[#111] border border-[#1f1f1f] rounded-md p-4 mb-5 animate-fadeUp">
          <p className="text-[10px] tracking-[0.16em] uppercase text-[#444] font-medium mb-3">New Entry</p>
          <input
            className="w-full bg-[#181818] border border-[#2a2a2a] rounded py-2.5 px-3 text-white text-[13px] font-light outline-none focus:border-[#333] placeholder:text-[#444] mb-2"
            placeholder="Source / description"
            value={source}
            onChange={e => setSource(e.target.value)}
          />
          <div className="grid grid-cols-2 gap-2 mb-3">
            <input
              className="bg-[#181818] border border-[#2a2a2a] rounded py-2.5 px-3 text-white text-[13px] font-light outline-none focus:border-[#333] placeholder:text-[#444]"
              placeholder="Amount"
              type="number"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
            />
            <select
              className="bg-[#181818] border border-[#2a2a2a] rounded py-2.5 px-3 text-white text-[13px] font-light outline-none focus:border-[#333]"
              value={type}
              onChange={e => setType(e.target.value)}
            >
              <option value="in">Income</option>
              <option value="out">Expense</option>
            </select>
          </div>
          <div className="flex gap-2">
            <Button variant="solid" size="sm" onClick={handleAdd}>+ Log</Button>
            <Button variant="muted" size="xs" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      )}

      {/* Entries */}
      <p className="text-[10px] tracking-[0.2em] uppercase text-[#444] font-medium mb-3">Entries</p>

      {loading && entries.length === 0 && (
        <div className="flex justify-center py-8">
          <div className="w-5 h-5 border-2 border-[#2a2a2a] border-t-white rounded-full animate-spin" />
        </div>
      )}

      {!loading && entries.length === 0 && (
        <p className="text-[13px] text-[#444] font-light text-center py-6">No entries yet.</p>
      )}

      <div className="space-y-2">
        {entries.map(e => (
          <div
            key={e.id}
            className="bg-[#111] border border-[#1f1f1f] rounded-md px-4 py-3 flex items-center justify-between"
          >
            <div>
              <p className="text-[13px] font-medium">{e.source}</p>
              <p className="text-[10px] text-[#444] mt-0.5">{fd(e.created_at)}</p>
            </div>
            <div className="flex items-center gap-3">
              <span
                className="font-serif text-[16px] font-bold"
                style={{ color: e.type === 'in' ? '#4ade80' : '#f87171' }}
              >
                {e.type === 'in' ? '+' : '-'}{fmt(e.amount)}
              </span>
              <button
                onClick={() => deleteEntry(e.id)}
                className="text-[#2a2a2a] hover:text-[#444] text-[13px] transition-colors"
              >
                ✕
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}