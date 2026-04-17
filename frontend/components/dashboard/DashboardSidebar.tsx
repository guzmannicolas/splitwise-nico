import React from 'react'

type ViewType = 'summary' | 'expenses' | 'groups' | 'create'

type Props = {
  activeView: ViewType
  onChange: (view: ViewType) => void
  groupsCount: number
}

export default function DashboardSidebar({ activeView, onChange, groupsCount }: Props) {
  return (
    <div className="bg-white dark:bg-slate-900 shadow-xl rounded-2xl p-4 border border-blue-100 dark:border-slate-800 sticky top-4">
      <h2 className="text-lg font-bold text-gray-700 dark:text-slate-100 mb-4">Navegación</h2>
      <nav className="space-y-2">
        <button
          onClick={() => onChange('summary')}
          className={`w-full text-left px-4 py-3 rounded-lg font-semibold transition-all ${
            activeView === 'summary'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
          }`}
        >
          💰 Resumen General
        </button>
        <button
          onClick={() => onChange('groups')}
          className={`w-full text-left px-4 py-3 rounded-lg font-semibold transition-all ${
            activeView === 'groups'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
          }`}
        >
          👥 Tus Grupos ({groupsCount})
        </button>
        <button
          onClick={() => onChange('expenses')}
          className={`w-full text-left px-4 py-3 rounded-lg font-semibold transition-all ${
            activeView === 'expenses'
              ? 'bg-blue-600 text-white shadow-md'
              : 'bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 hover:bg-gray-200 dark:hover:bg-slate-700'
          }`}
        >
          📝 Últimos Gastos
        </button>
      </nav>
    </div>
  )
}
