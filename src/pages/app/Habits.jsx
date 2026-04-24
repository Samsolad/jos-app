import { useEffect, useState } from 'react'
import useHabitStore from '../../store/habitStore'
import Button from '../../components/ui/Button'

const FREQ_LABELS = {
  daily: 'Daily',
  weekdays: 'Weekdays',
  weekends: 'Weekends',
  weekly: 'Weekly',
}

export default function Habits() {
  const { habits, loading, fetchHabits, addHabit, deleteHabit, toggleLog, isLoggedToday, getStreak } = useHabitStore()
  const [name, setName] = useState('')
  const [freq, setFreq] = useState('daily')
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => { fetchHabits() }, [])

  const handleAdd = async () => {
    if (!name.trim()) return
    await addHabit(name.trim(), freq)
    setName('')
    setFreq('daily')
    setShowAdd(false)
  }

  const today = new Date().toLocaleDateString('en-GB', {
    weekday: 'long', day: 'numeric', month: 'long'
  })

  const totalDone = habits.filter(h => isLoggedToday(h.id)).length

  return (
    <div className="animate-fadeUp max-w-xl">
      <p className="text-[10px] tracking-[0.2em] uppercase text-[#444] font-medium mb-2">Daily</p>
      <h1 className="font-serif text-[24px] sm:text-[26px] font-bold mb-1">
        Habit <em className="text-[#e8e8e8]">Tracker</em>
      </h1>
      <p className="text-[13px] text-[#888] font-light mb-1">{today}</p>
      {habits.length > 0 && (
        <p className="text-[13px] text-[#888] font-light mb-6">
          {totalDone}/{habits.length} done today
        </p>
      )}

      {loading && habits.length === 0 && (
        <div className="flex justify-center py-10">
          <div className="w-5 h-5 border-2 border-[#2a2a2a] border-t-white rounded-full animate-spin" />
        </div>
      )}

      {!loading && habits.length === 0 && (
        <div className="text-center py-8 text-[#444] mb-6">
          <p className="text-[28px] mb-2">⊕</p>
          <p className="text-[13px] font-light">No habits yet. Add your first below.</p>
        </div>
      )}

      {/* Habit list */}
      <div className="space-y-2 mb-6">
        {habits.map(h => {
          const done = isLoggedToday(h.id)
          const streak = getStreak(h.id)
          return (
            <div
              key={h.id}
              className={`bg-[#111] border rounded-md px-4 py-3.5 flex items-center justify-between transition-all ${
                done ? 'border-[#22c55e]/30 bg-[#22c55e]/[0.04]' : 'border-[#1f1f1f] hover:border-[#2a2a2a]'
              }`}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2.5 mb-0.5">
                  <p className={`text-[14px] font-medium ${done ? 'text-[#4ade80]' : 'text-white'}`}>
                    {h.name}
                  </p>
                  {done && <span className="text-[10px] text-[#4ade80]">✓</span>}
                </div>
                <div className="flex gap-3">
                  <span className="text-[10px] text-[#444]">{FREQ_LABELS[h.frequency]}</span>
                  {streak > 0 && (
                    <span className="text-[10px] text-[#888]">🔥 {streak} day streak</span>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  onClick={() => toggleLog(h.id)}
                  className={`px-3 py-1.5 text-[11px] font-semibold tracking-[0.08em] uppercase rounded border transition-all ${
                    done
                      ? 'border-[#22c55e]/30 text-[#4ade80] bg-transparent hover:bg-[#22c55e]/10'
                      : 'border-white bg-white text-[#080808] hover:bg-[#e8e8e8]'
                  }`}
                >
                  {done ? 'Undo' : 'Log'}
                </button>
                <button
                  onClick={() => deleteHabit(h.id)}
                  className="text-[#2a2a2a] hover:text-[#444] text-[13px] px-1 transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add habit */}
      {!showAdd ? (
        <Button variant="ghost" size="sm" onClick={() => setShowAdd(true)}>+ Add Habit</Button>
      ) : (
        <div className="bg-[#111] border border-[#1f1f1f] rounded-md p-4 animate-fadeUp">
          <p className="text-[10px] tracking-[0.16em] uppercase text-[#444] font-medium mb-3">New Habit</p>
          <input
            className="w-full bg-[#181818] border border-[#2a2a2a] rounded py-2.5 px-3 text-white text-[13px] font-light outline-none focus:border-[#333] placeholder:text-[#444] mb-3"
            placeholder="Habit name e.g. Exercise, Read, Journal…"
            value={name}
            onChange={e => setName(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            autoFocus
          />
          <select
            className="w-full bg-[#181818] border border-[#2a2a2a] rounded py-2.5 px-3 text-white text-[13px] font-light outline-none focus:border-[#333] mb-3"
            value={freq}
            onChange={e => setFreq(e.target.value)}
          >
            <option value="daily">Daily</option>
            <option value="weekdays">Weekdays only</option>
            <option value="weekends">Weekends only</option>
            <option value="weekly">Weekly</option>
          </select>
          <div className="flex gap-2">
            <Button variant="solid" size="sm" onClick={handleAdd}>+ Add</Button>
            <Button variant="muted" size="xs" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  )
}