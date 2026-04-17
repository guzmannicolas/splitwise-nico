import React, { useState, useRef, useEffect } from 'react'
import type { Group } from '../../lib/services/types'
import { useRouter } from 'next/router'

interface GroupHeaderProps {
  group: Group
  currentUserId: string | null
  onLeave: () => Promise<void> | void
  onDelete: () => Promise<void> | void
}

export default function GroupHeader({ group, currentUserId, onLeave, onDelete }: GroupHeaderProps) {
  const router = useRouter()
  const isOwner = group.created_by === currentUserId
  const createdDate = new Date(group.created_at).toLocaleDateString()
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Cerrar menú al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-slate-800 dark:to-slate-900 text-white p-5 md:p-6 rounded-2xl shadow-xl mb-6 border-b-4 border-blue-700 dark:border-slate-700 transition-all duration-300">
      <div className="flex justify-between items-center">
        {/* Lado Izquierdo: Nombre y Fecha */}
        <div>
          <h1 className="text-xl md:text-3xl font-bold">{group.name}</h1>
          <p className="text-[10px] md:text-xs text-blue-200 dark:text-slate-400 font-medium">
            Creado el {createdDate}
          </p>
        </div>

        {/* Lado Derecho: Acciones (Desktop: Botones, Mobile: Gear) */}
        <div className="flex items-center gap-2">
          {/* Botones Desktop */}
          <div className="hidden md:flex gap-2">
            <button
              onClick={() => router.push('/dashboard')}
              className="px-4 py-2 bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-semibold rounded-lg hover:bg-blue-50 dark:hover:bg-slate-600 transition-colors shadow-sm text-sm"
            >
              ← Dashboard
            </button>
            <button
              onClick={onLeave}
              className="px-4 py-2 bg-yellow-500 text-white font-semibold rounded-lg hover:bg-yellow-600 transition-colors text-sm"
            >
              Salir del grupo
            </button>
            {isOwner && (
              <button
                onClick={onDelete}
                className="px-4 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors text-sm"
              >
                Eliminar grupo
              </button>
            )}
          </div>

          {/* Menú Mobile (Gear) */}
          <div className="md:hidden relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="p-2 bg-white/20 hover:bg-white/30 rounded-full transition-colors"
              aria-label="Ajustes"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.592c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.127c-.332.183-.582.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            {/* Dropdown Mobile */}
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-xl shadow-2xl border border-gray-100 dark:border-slate-700 z-[70] overflow-hidden animate-in fade-in zoom-in duration-200 origin-top-right">
                <div className="flex flex-col">
                  <button
                    onClick={() => { router.push('/dashboard'); setMenuOpen(false); }}
                    className="flex items-center gap-3 px-4 py-3 text-sm text-gray-700 dark:text-slate-200 hover:bg-gray-50 dark:hover:bg-slate-700 transition-colors text-left"
                  >
                    <span>🏠</span> Ir al Dashboard
                  </button>
                  <button
                    onClick={() => { onLeave(); setMenuOpen(false); }}
                    className="flex items-center gap-3 px-4 py-3 text-sm text-yellow-600 dark:text-yellow-500 hover:bg-yellow-50 dark:hover:bg-yellow-900/10 transition-colors text-left font-medium"
                  >
                    <span>🚪</span> Salir del grupo
                  </button>
                  {isOwner && (
                    <button
                      onClick={() => { onDelete(); setMenuOpen(false); }}
                      className="flex items-center gap-3 px-4 py-3 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/10 transition-colors text-left font-medium"
                    >
                      <span>🗑️</span> Eliminar grupo
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
