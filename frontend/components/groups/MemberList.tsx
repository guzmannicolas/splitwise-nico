import { useState } from 'react'
import type { Member } from '../../lib/services/types'

interface MemberListProps {
  members: Member[]
  currentUserId: string | null
  onInvite: (email: string) => Promise<void>
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
  inviting
}: MemberListProps) {
  const [inviteEmail, setInviteEmail] = useState('')

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!inviteEmail) return

    await onInvite(inviteEmail)
    setInviteEmail('')
  }

  return (
    <div className="bg-white shadow-xl rounded-2xl p-6 border border-indigo-100">
      <h2 className="text-2xl font-bold text-indigo-700 mb-4">Miembros</h2>
      <ul className="space-y-2 mb-4">
        {members.map(m => (
          <li
            key={m.user_id}
            className="flex items-center gap-2 p-2 bg-indigo-50 rounded"
          >
            <span className="text-2xl">👤</span>
            <span className="font-semibold">
              {m.profiles?.full_name || m.user_id.slice(0, 8)}
              {m.user_id === currentUserId && ' (Tú)'}
            </span>
          </li>
        ))}
      </ul>

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
    </div>
  )
}
