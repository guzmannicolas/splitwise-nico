import React from 'react'
import type { Group } from '../../lib/services/types'
import { useRouter } from 'next/router'

interface GroupHeaderProps {
  group: Group
  currentUserId: string | null
  onLeave: () => Promise<void> | void
  onDelete: () => Promise<void> | void
}

/**
 * Encapsula presentación del encabezado del grupo y acciones principales.
 * Responsabilidad: mostrar metadatos y disparar callbacks (sin lógica de negocio interna).
 */
export default function GroupHeader({ group, currentUserId, onLeave, onDelete }: GroupHeaderProps) {
  const router = useRouter()
  const isOwner = group.created_by === currentUserId
  const createdDate = new Date(group.created_at).toLocaleDateString()

  return (
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 dark:from-slate-800 dark:to-slate-900 text-white p-6 rounded-2xl shadow-xl mb-6 border-b-4 border-blue-700 dark:border-slate-700 transition-all duration-300">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold mb-2">{group.name}</h1>
          {group.description && (
            <p className="text-blue-100 dark:text-slate-300">{group.description}</p>
          )}
          <p className="text-xs text-blue-200 dark:text-slate-400 mt-2">Creado el {createdDate}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => router.push('/dashboard')}
            className="px-4 py-2 bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 font-semibold rounded-lg hover:bg-blue-50 dark:hover:bg-slate-600 transition-colors shadow-sm"
          >
            ← Dashboard
          </button>
          <button
            onClick={onLeave}
            className="px-4 py-2 bg-yellow-500 text-white font-semibold rounded-lg hover:bg-yellow-600 transition-colors"
          >
            Salir del grupo
          </button>
          {isOwner && (
            <button
              onClick={onDelete}
              className="px-4 py-2 bg-red-500 text-white font-semibold rounded-lg hover:bg-red-600 transition-colors"
            >
              Eliminar grupo
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
