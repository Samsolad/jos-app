import { useEffect, useState } from 'react'
import useFamilyStore from '../../store/familyStore'
import Button from '../../components/ui/Button'

export default function Family() {
  const { contacts, loading, fetchContacts, addContact, logContact, deleteContact, daysSince } = useFamilyStore()
  const [desc, setDesc] = useState('')
  const [showAdd, setShowAdd] = useState(false)

  useEffect(() => { fetchContacts() }, [])

  const handleAdd = async () => {
    if (!desc.trim()) return
    await addContact(desc.trim())
    setDesc('')
    setShowAdd(false)
  }

  const urgencyColor = (days) => {
    if (days === null) return '#444'
    if (days > 14) return '#f87171'
    if (days > 7) return '#fbbf24'
    return '#4ade80'
  }

  const urgencyLabel = (days) => {
    if (days === null) return 'Never logged'
    if (days === 0) return 'Today'
    if (days === 1) return 'Yesterday'
    return `${days}d ago`
  }

  return (
    <div className="animate-fadeUp max-w-xl">
      <p className="text-[10px] tracking-[0.2em] uppercase text-[#444] font-medium mb-2">Connections</p>
      <h1 className="font-serif text-[24px] sm:text-[26px] font-bold mb-1">
        Family & <em className="text-[#e8e8e8]">Relationships</em>
      </h1>
      <p className="text-[13px] text-[#888] font-light mb-6">
        Stay connected with the people who matter.
      </p>

      {loading && contacts.length === 0 && (
        <div className="flex justify-center py-8">
          <div className="w-5 h-5 border-2 border-[#2a2a2a] border-t-white rounded-full animate-spin" />
        </div>
      )}

      {!loading && contacts.length === 0 && (
        <div className="text-center py-8 text-[#444] mb-6">
          <p className="text-[28px] mb-2">⊗</p>
          <p className="text-[13px] font-light">No contacts yet. Add the people you want to stay close to.</p>
        </div>
      )}

      {/* Contacts */}
      <div className="space-y-2 mb-6">
        {contacts.map(c => {
          const days = daysSince(c.last_contact)
          const color = urgencyColor(days)
          return (
            <div
              key={c.id}
              className="bg-[#111] border border-[#1f1f1f] rounded-md p-4 flex items-center justify-between gap-3"
            >
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-medium mb-1">{c.description}</p>
                <p className="text-[11px] font-light" style={{ color }}>
                  {urgencyLabel(days)}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <Button variant="solid" size="xs" onClick={() => logContact(c.id)}>
                  Log Contact
                </Button>
                <button
                  onClick={() => deleteContact(c.id)}
                  className="text-[#2a2a2a] hover:text-[#444] text-[13px] transition-colors"
                >
                  ✕
                </button>
              </div>
            </div>
          )
        })}
      </div>

      {/* Add */}
      {!showAdd ? (
        <Button variant="ghost" size="sm" onClick={() => setShowAdd(true)}>+ Add Contact</Button>
      ) : (
        <div className="bg-[#111] border border-[#1f1f1f] rounded-md p-4 animate-fadeUp">
          <p className="text-[10px] tracking-[0.16em] uppercase text-[#444] font-medium mb-3">New Contact</p>
          <input
            className="w-full bg-[#181818] border border-[#2a2a2a] rounded py-2.5 px-3 text-white text-[13px] font-light outline-none focus:border-[#333] placeholder:text-[#444] mb-3"
            placeholder="e.g. Mum — call weekly, Best friend Tolu, Partner"
            value={desc}
            onChange={e => setDesc(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            autoFocus
          />
          <div className="flex gap-2">
            <Button variant="solid" size="sm" onClick={handleAdd}>+ Add</Button>
            <Button variant="muted" size="xs" onClick={() => setShowAdd(false)}>Cancel</Button>
          </div>
        </div>
      )}
    </div>
  )
}