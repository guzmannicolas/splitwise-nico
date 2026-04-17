import React from 'react'
import type { GlobalSummary } from '../../lib/services/SummaryService'

type Group = {
  id: string
  name: string
  description?: string
}

type Props = {
  groups: Group[]
  loading: boolean
  summary: GlobalSummary | null
  onCreateGroup?: () => void
}

export default function GroupsPanel({ groups, loading, summary, onCreateGroup }: Props) {
  return (
    <div className="bg-white dark:bg-slate-900 shadow-xl rounded-2xl p-6 border border-blue-100 dark:border-slate-800">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-blue-700 dark:text-blue-400">Tus grupos</h2>
        {onCreateGroup && (
          <button
            onClick={onCreateGroup}
            className="px-4 py-2 bg-green-600 dark:bg-green-700 text-white font-semibold rounded-lg hover:bg-green-700 dark:hover:bg-green-800 transition-colors shadow-md"
          >
            ➕ Crear Grupo
          </button>
        )}
      </div>
      {loading ? (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500 mx-auto"></div>
        </div>
      ) : groups.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {groups.map(group => (
            <div
              key={group.id}
              className="bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-slate-800 dark:to-slate-700 border border-blue-200 dark:border-slate-600 rounded-xl p-5 hover:shadow-lg cursor-pointer transition-all duration-200"
              onClick={() => (window.location.href = `/groups/${group.id}`)}
            >
              <h3 className="font-bold text-lg text-blue-800 dark:text-slate-100">{group.name}</h3>
              {group.description && (
                <p className="text-gray-600 dark:text-slate-300 text-sm mt-2">{group.description}</p>
              )}
              {summary?.byGroup.find(g => g.group_id === group.id) && (
                <p
                  className={`text-sm font-bold mt-3 ${
                    (summary.byGroup.find(g => g.group_id === group.id)?.net || 0) >= 0
                      ? 'text-green-600 dark:text-green-500'
                      : 'text-red-600 dark:text-red-500'
                  }`}
                >
                  Balance: {(summary.byGroup.find(g => g.group_id === group.id)?.net || 0).toFixed(2)}
                </p>
              )}
            </div>
          ))}
        </div>
      ) : (
        <p className="text-gray-400 dark:text-slate-500 text-center py-8">No hay grupos todavía</p>
      )}
    </div>
  )
}
