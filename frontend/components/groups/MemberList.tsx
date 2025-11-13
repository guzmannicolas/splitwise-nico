import { useState } from 'react'
import type { Member } from '../../lib/services/types'

interface MemberListProps {
  members: Member[]
  currentUserId: string | null
  onInvite: (email: string) => Promise<void>
  onAddGuest: (fullName: string) => Promise<void>
  inviting: boolean
}

/**
 * Componente para mostrar miembros e invitar nuevos
 * Responsabilidad única: Gestión de miembros del grupo
 */
export default function MemberList({
  members,
  currentUserId,
  onInvite,
  onAddGuest,
  inviting
}: MemberListProps) {
  const [inviteEmail, setInviteEmail] = useState('')
  const [guestName, setGuestName] = useState('')
  const [addingGuest, setAddingGuest] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail) return

    await onInvite(inviteEmail)
    setInviteEmail('')
  }

  const handleAddGuest = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!guestName.trim()) return

    setAddingGuest(true)
    try {
      await onAddGuest(guestName.trim())
      setGuestName('')
    } finally {
      setAddingGuest(false)
    }
  }

  return (
    <div className="bg-white shadow-xl rounded-2xl p-6 border border-indigo-100">
      <h2 
        className="text-2xl font-bold text-indigo-700 mb-4 cursor-pointer flex items-center justify-between hover:text-indigo-800 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span>Miembros</span>
        <span className="text-xl">{isExpanded ? '▼' : '▶'}</span>
      </h2>
      
      {isExpanded && (
      <>
      <ul className="space-y-2 mb-4">
        {members.map(m => {
          const isGuest = m.profiles?.email === null
          return (
            <li
              key={m.user_id}
              className="flex items-center gap-2 p-2 bg-indigo-50 rounded"
            >
              <span className="text-2xl">{isGuest ? '👥' : '👤'}</span>
              <span className="font-semibold flex-1">
                {m.profiles?.full_name || m.user_id.slice(0, 8)}
                {m.user_id === currentUserId && ' (Tú)'}
              </span>
              {isGuest && (
                <span className="px-2 py-1 bg-amber-100 text-amber-700 text-xs font-bold rounded-full">
                  Invitado
                </span>
              )}
            </li>
          )
        })}
      </ul>

      {/* Agregar invitado rápido */}
      <form onSubmit={handleAddGuest} className="flex gap-2 mb-3">
        <input
          type="text"
          value={guestName}
          onChange={e => setGuestName(e.target.value)}
          className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-amber-500"
          placeholder="Nombre del invitado"
          disabled={addingGuest}
          required
        />
        <button
          type="submit"
          disabled={addingGuest}
          className="px-4 py-2 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {addingGuest ? '...' : 'Agregar'}
        </button>
      </form>

      {/* Invitar por email */}
      <form onSubmit={handleInvite} className="flex gap-2">
        <input
          type="email"
          value={inviteEmail}
          onChange={e => setInviteEmail(e.target.value)}
          className="flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500"
          placeholder="Email para invitar"
          disabled={inviting}
          required
        />
        <button
          type="submit"
          disabled={inviting}
          className="px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {inviting ? '...' : 'Invitar'}
        </button>
      </form>
      </>
      )}
    </div>
  )
}
