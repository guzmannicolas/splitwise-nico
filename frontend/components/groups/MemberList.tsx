import { useEffect, useRef, useState } from 'react'
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
  const [showInviteInfo, setShowInviteInfo] = useState(false)
  const [showGuestInfo, setShowGuestInfo] = useState(false)
  const inviteInfoRef = useRef<HTMLDivElement>(null)
  const guestInfoRef = useRef<HTMLDivElement>(null)

  // Cerrar tooltips al hacer click/touch afuera (soporta móvil)
  useEffect(() => {
    const handler = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node
      if (showInviteInfo && inviteInfoRef.current && !inviteInfoRef.current.contains(target)) {
        setShowInviteInfo(false)
      }
      if (showGuestInfo && guestInfoRef.current && !guestInfoRef.current.contains(target)) {
        setShowGuestInfo(false)
      }
    }
    document.addEventListener('mousedown', handler)
    document.addEventListener('touchstart', handler)
    return () => {
      document.removeEventListener('mousedown', handler)
      document.removeEventListener('touchstart', handler)
    }
  }, [showInviteInfo, showGuestInfo])

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

      {/* Invitar por email (primero) */}
      <form onSubmit={handleInvite} className="flex flex-col sm:flex-row gap-2 mb-2">
        <input
          type="email"
          value={inviteEmail}
          onChange={e => setInviteEmail(e.target.value)}
          className="w-full sm:flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-indigo-500 text-sm min-w-0"
          placeholder="Email para invitar"
          disabled={inviting}
          required
        />
        <button
          type="submit"
          disabled={inviting}
          className="sm:w-28 w-full px-4 py-2 bg-indigo-600 text-white font-semibold rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-1"
        >
          {inviting ? '...' : 'Invitar'}
        </button>
      </form>
      <div className="relative flex justify-end mb-4" ref={inviteInfoRef}>
        <button
          type="button"
          onClick={() => setShowInviteInfo(v => !v)}
          aria-expanded={showInviteInfo}
          className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 font-bold hover:bg-indigo-200"
        >
          !
        </button>
        {showInviteInfo && (
          <div className="absolute right-0 top-full mt-2 w-64 max-w-[85vw] p-3 bg-white text-gray-700 text-xs rounded-lg shadow-xl ring-1 ring-black/5 z-20">
            <div className="absolute -top-1.5 right-3 w-3 h-3 bg-white rotate-45 ring-1 ring-black/5" />
            Invita a un amigo con su email para que pueda entrar al grupo y ver todos los gastos. Recibirá un correo y podrá crear su cuenta.
          </div>
        )}
      </div>
      

      {/* Agregar invitado rápido (segundo) */}
      <form onSubmit={handleAddGuest} className="flex flex-col sm:flex-row gap-2 mb-2">
        <input
          type="text"
          value={guestName}
          onChange={e => setGuestName(e.target.value)}
          className="w-full sm:flex-1 p-2 border rounded-lg focus:ring-2 focus:ring-amber-500 text-sm min-w-0"
          placeholder="Nombre del invitado"
          disabled={addingGuest}
          required
        />
        <button
          type="submit"
          disabled={addingGuest}
          className="sm:w-28 w-full px-4 py-2 bg-amber-500 text-white font-semibold rounded-lg hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {addingGuest ? '...' : (
            <>
              <span className="hidden sm:inline">Agregar</span>
              <span className="sm:hidden inline-block" aria-hidden>
                <svg viewBox="0 0 24 24" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 5v14M5 12h14" />
                </svg>
              </span>
            </>
          )}
        </button>
      </form>
      <div className="relative flex justify-end mb-2" ref={guestInfoRef}>
        <button
          type="button"
          onClick={() => setShowGuestInfo(v => !v)}
          aria-expanded={showGuestInfo}
          className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-100 text-amber-700 font-bold hover:bg-amber-200"
        >
          !
        </button>
        {showGuestInfo && (
          <div className="absolute right-0 top-full mt-2 w-64 max-w-[85vw] p-3 bg-white text-gray-700 text-xs rounded-lg shadow-xl ring-1 ring-black/5 z-20">
            <div className="absolute -top-1.5 right-3 w-3 h-3 bg-white rotate-45 ring-1 ring-black/5" />
            Un invitado sin mail solo lo ves vos. Ideal para armar grupos rápidos (por ejemplo: "Juan", "Ana") sin crear cuentas reales.
          </div>
        )}
      </div>
      
      </>
      )}
    </div>
  )
}
