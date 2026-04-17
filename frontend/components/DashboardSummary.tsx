import React from 'react'
import { useRouter } from 'next/router'
import type { GlobalSummary } from '../lib/services/SummaryService'

type Props = {
  summary: GlobalSummary | null
  loading?: boolean
}

export default function DashboardSummary({ summary, loading }: Props) {
  const router = useRouter()
  return (
    <div className="bg-gradient-to-br from-white to-blue-50 dark:from-slate-900 dark:to-slate-800 shadow-xl rounded-2xl p-6 border border-blue-100 dark:border-slate-700">
      <h2 className="text-2xl font-bold text-blue-700 dark:text-blue-400 mb-6">Resumen General</h2>
      {loading ? (
        <p className="text-gray-500 dark:text-slate-400">Cargando resumen...</p>
      ) : !summary ? (
        <p className="text-gray-400 dark:text-slate-500">Sin datos de resumen</p>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="p-6 bg-white dark:bg-slate-800 rounded-xl shadow-md border border-green-200 dark:border-green-900/30">
              <p className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Te deben</p>
              <p className="text-3xl font-extrabold text-green-600 dark:text-green-500 mt-2">${summary.owedToMe.toFixed(2)}</p>
            </div>
            <div className="p-6 bg-white dark:bg-slate-800 rounded-xl shadow-md border border-red-200 dark:border-red-900/30">
              <p className="text-sm font-semibold text-gray-500 dark:text-slate-400 uppercase tracking-wide">Debés</p>
              <p className="text-3xl font-extrabold text-red-600 dark:text-red-500 mt-2">${summary.owedByMe.toFixed(2)}</p>
            </div>
            <div className="p-6 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-xl shadow-md text-white">
              <p className="text-sm font-semibold uppercase tracking-wide">Neto</p>
              <p className="text-3xl font-extrabold mt-2">${summary.net.toFixed(2)}</p>
            </div>
          </div>
          {summary.byGroup.length > 0 && (
            <div className="mt-8">
              <h3 className="text-xl font-bold text-blue-700 dark:text-blue-400 mb-3">Por grupo</h3>
              <ul className="grid grid-cols-1 gap-3">
                {summary.byGroup.map(g => (
                  <li key={g.group_id}>
                    <div
                      role="button"
                      tabIndex={0}
                      onClick={() => router.push(`/groups/${g.group_id}`)}
                      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') router.push(`/groups/${g.group_id}`) }}
                      className="group flex items-center justify-between p-5 rounded-xl border transition-all duration-200 cursor-pointer
                                 bg-white dark:bg-slate-800 border-blue-100 dark:border-slate-700 hover:border-blue-300 dark:hover:border-slate-500 hover:shadow-md"
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-1 text-blue-500 dark:text-blue-400">👥</div>
                        <div>
                          <p className="text-lg font-semibold text-gray-900 dark:text-slate-100 leading-none">{g.group_name}</p>
                          <p className="text-sm text-gray-500 dark:text-slate-400 mt-1">Te deben: ${g.owedToMe.toFixed(2)} · Debés: ${g.owedByMe.toFixed(2)}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-extrabold ${g.net >= 0 ? 'text-green-600 dark:text-green-500' : 'text-red-600 dark:text-red-500'}`}>{g.net.toFixed(2)}</span>
                        <span className="text-gray-400 group-hover:text-blue-500 transition-colors">➜</span>
                      </div>
                    </div>
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
