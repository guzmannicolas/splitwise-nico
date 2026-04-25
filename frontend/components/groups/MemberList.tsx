import React, { useState, useEffect } from 'react'
import type { Member } from '../../lib/services/types'

interface MemberListProps {
  members: Member[]
  currentUserId: string | null
  onInvite: (email: string) => Promise<void>
  onAddGuest: (fullName: string) => Promise<void>
  onRemoveGuest?: (userId: string) => Promise<void>
  inviting: boolean
}

export default function MemberList({
  members,
  currentUserId,
  onInvite,
  onAddGuest,
  onRemoveGuest,
  inviting
}: MemberListProps) {
  const [inviteEmail, setInviteEmail] = useState('')
  const [guestName, setGuestName] = useState('')
  const [addingGuest, setAddingGuest] = useState(false)
  const [isModalOpen, setIsModalOpen] = useState(false)

  // Para desktop, mantenemos la vista expandida
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const checkIsDesktop = () => setIsDesktop(window.innerWidth >= 1024)
    checkIsDesktop()
    window.addEventListener('resize', checkIsDesktop)
    return () => window.removeEventListener('resize', checkIsDesktop)
  }, [])

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

  const [visibleCount, setVisibleCount] = useState(4)

  // Recortar la lista si es necesario
  const shouldShowToggle = members.length > 4
  const hasMore = members.length > visibleCount
  const displayedMembers = members.slice(0, visibleCount)

  const handleShowMore = () => {
    setVisibleCount(prev => prev + 4)
  }

  const handleShowLess = () => {
    setVisibleCount(4)
  }

  // Renderizado del contenido (reutilizable para Desktop y Modal)
  const renderContent = () => (
    <div className="space-y-4">
      <ul className="space-y-2">
        {displayedMembers.map(m => {
          const isGuest = m.profiles?.email === null
          return (
            <li
              key={m.user_id}
              className="flex items-center gap-3 p-3 bg-indigo-50/50 dark:bg-slate-800/50 rounded-xl border border-indigo-100/50 dark:border-slate-700/50 transition-all duration-300 animate-in fade-in"
            >
              <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-sm font-bold">
                {m.profiles?.full_name ? m.profiles.full_name.charAt(0).toUpperCase() : '?'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-bold text-gray-900 dark:text-white truncate">
                  {m.profiles?.full_name || m.user_id.slice(0, 8)}
                  {m.user_id === currentUserId && <span className="text-indigo-600 dark:text-indigo-400 ml-1 font-normal text-xs">(Tú)</span>}
                </p>
                <p className="text-xs text-gray-500 dark:text-slate-400 truncate">
                  {isGuest ? 'Usuario invitado' : (m.profiles?.email || 'Miembro')}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {isGuest && (
                  <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-[10px] font-bold rounded-full border border-amber-200 dark:border-amber-800">
                    GUEST
                  </span>
                )}
                {isGuest && onRemoveGuest && (
                  <button
                    onClick={() => {
                      if (confirm(`¿Eliminar al invitado "${m.profiles?.full_name}"? Solo podrás hacerlo si no tiene gastos asociados.`)) {
                        onRemoveGuest(m.user_id)
                      }
                    }}
                    className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Eliminar invitado"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>

      {shouldShowToggle && (
        <div className="flex gap-2">
          {hasMore ? (
            <button
              onClick={handleShowMore}
              className="w-full py-2 text-sm font-bold text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center justify-center gap-2 transition-colors border border-dashed border-indigo-200 dark:border-slate-700 rounded-xl bg-indigo-50/30 dark:bg-slate-800/20"
            >
              Ver {Math.min(4, members.length - visibleCount)} más... <span>▼</span>
            </button>
          ) : (
            <button
              onClick={handleShowLess}
              className="w-full py-2 text-sm font-bold text-indigo-400 dark:text-slate-500 hover:text-indigo-500 flex items-center justify-center gap-2 transition-colors border border-dashed border-indigo-100 dark:border-slate-800 rounded-xl bg-gray-50/30 dark:bg-slate-800/10"
            >
              Ver menos <span>▲</span>
            </button>
          )}
        </div>
      )}

      <div className="pt-4 border-t border-gray-100 dark:border-slate-800 space-y-4">
        <div>
          <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-1">Invitar por Email</label>
          <form onSubmit={handleInvite} className="flex gap-2">
            <input
              type="email"
              value={inviteEmail}
              onChange={e => setInviteEmail(e.target.value)}
              className="flex-1 px-4 py-2 text-sm border rounded-xl bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-indigo-500 transition-all"
              placeholder="email@ejemplo.com"
              disabled={inviting}
              required
            />
            <button
              type="submit"
              disabled={inviting}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-indigo-500/20 active:scale-95 text-sm"
            >
              {inviting ? '...' : 'Agregar'}
            </button>
          </form>
        </div>
        <div>
          <label className="block text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest mb-2 px-1">Crear Invitado sin Mail</label>
          <form onSubmit={handleAddGuest} className="flex gap-2">
            <input
              type="text"
              value={guestName}
              onChange={e => setGuestName(e.target.value)}
              className="flex-1 px-4 py-2 text-sm border rounded-xl bg-gray-50 dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-amber-500 transition-all"
              placeholder="Ej: Juan Pérez"
              disabled={addingGuest}
              required
            />
            <button
              type="submit"
              disabled={addingGuest}
              className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white font-bold rounded-xl transition-all shadow-lg shadow-amber-500/20 active:scale-95 text-sm"
            >
              {addingGuest ? '...' : 'Agregar '}
            </button>
          </form>
        </div>
      </div>
    </div>
  )

  // VISTA DESKTOP
  if (isDesktop) {
    return (
      <div className="bg-white dark:bg-slate-900 shadow-xl rounded-2xl p-6 border border-indigo-100 dark:border-slate-800">
        <h2 className="text-2xl font-bold text-indigo-700 dark:text-indigo-400 mb-6 flex items-center gap-2">
          <span>👥 Miembros</span>
        </h2>
        {renderContent()}
      </div>
    )
  }

  // VISTA MOBILE
  return (
    <>
      {/* Gatillo (Trigger Card) */}
      <button
        onClick={() => setIsModalOpen(true)}
        className="w-full bg-white dark:bg-slate-900 shadow-xl rounded-2xl p-4 border border-indigo-100 dark:border-slate-800 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all text-indigo-600 dark:text-indigo-400"
      >
        <div className="p-3 bg-indigo-50 dark:bg-slate-800 rounded-full group-hover:bg-indigo-100 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-3.07M12 6.375a3.375 3.375 0 11-6.75 0 3.375 3.375 0 016.75 0zm8.25 2.25a2.625 2.625 0 11-5.25 0 2.625 2.625 0 015.25 0z" />
          </svg>
        </div>
        <span className="font-bold text-sm">Miembros</span>
        <span className="text-[10px] text-gray-400 dark:text-slate-500 uppercase">{members.length} personas</span>
      </button>

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>

          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] border-t border-indigo-100 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom-full duration-300">
            {/* Header Modal */}
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-6 text-white flex justify-between items-center shrink-0">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span>👥</span> Miembros del Grupo
              </h2>
              <button
                onClick={() => setIsModalOpen(false)}
                className="h-10 w-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Contenido Modal */}
            <div className="p-6 overflow-y-auto flex-1 pb-10">
              {renderContent()}
            </div>

            {/* Footer Modal */}
            <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 flex justify-center shrink-0">
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-full max-w-xs py-3 bg-gray-600 dark:bg-slate-700 text-white font-bold rounded-2xl hover:bg-gray-700 dark:hover:bg-slate-600 shadow-lg active:scale-95 transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
