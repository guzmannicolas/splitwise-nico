import React from 'react'
import type { GlobalSummary } from '../lib/services/SummaryService'

type Props = {
  summary: GlobalSummary | null
  loading?: boolean
}

export default function DashboardSummary({ summary, loading }: Props) {
  return (
    <div className="bg-gradient-to-br from-white to-blue-50 shadow-xl rounded-2xl p-6 border border-blue-100">
      <h2 className="text-2xl font-bold text-blue-700 mb-6">Resumen General</h2>
      {loading ? (
        <p className="text-gray-500">Cargando resumen...</p>
      ) : !summary ? (
        <p className="text-gray-400">Sin datos de resumen</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-white rounded-xl shadow-md border border-green-200">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Te deben</p>
              <p className="text-3xl font-extrabold text-green-600 mt-2">${summary.owedToMe.toFixed(2)}</p>
            </div>
            <div className="p-6 bg-white rounded-xl shadow-md border border-red-200">
              <p className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Debés</p>
              <p className="text-3xl font-extrabold text-red-600 mt-2">${summary.owedByMe.toFixed(2)}</p>
            </div>
            <div className="p-6 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-md text-white">
              <p className="text-sm font-semibold uppercase tracking-wide">Neto</p>
              <p className="text-3xl font-extrabold mt-2">${summary.net.toFixed(2)}</p>
            </div>
          </div>
          {summary.byGroup.length > 0 && (
            <div className="mt-6">
              <h3 className="text-lg font-semibold text-blue-600 mb-2">Por grupo</h3>
              <ul className="divide-y divide-gray-200 bg-white rounded-xl border border-gray-100">
                {summary.byGroup.map(g => (
                  <li key={g.group_id} className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium text-gray-800">{g.group_name}</p>
                      <p className="text-xs text-gray-500 mt-1">Te deben: ${g.owedToMe.toFixed(2)} · Debés: ${g.owedByMe.toFixed(2)}</p>
                    </div>
                    <span className={`text-sm font-bold ${g.net >= 0 ? 'text-green-600' : 'text-red-600'}`}>{g.net.toFixed(2)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  )
}
