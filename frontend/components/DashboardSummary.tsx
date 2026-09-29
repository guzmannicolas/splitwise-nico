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

          <div className={`p-6 rounded-2xl shadow-md border flex flex-col md:flex-row items-center justify-between gap-4 ${
            summary.net > 0 
              ? 'bg-green-500/10 border-green-500/30 text-green-700 dark:text-green-400' 
              : summary.net < 0 
              ? 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400' 
              : 'bg-slate-500/10 border-slate-500/30 text-slate-700 dark:text-slate-300'
          }`}>
            <div>
              <p className="text-sm font-semibold uppercase tracking-wider opacity-80">Balance General</p>
              <h3 className="text-2xl font-extrabold mt-1">
                {summary.net > 0 ? 'En total te deben' : summary.net < 0 ? 'En total debés' : 'Estás al día'}
              </h3>
            </div>
            <div className="text-4xl font-black">
              {summary.net > 0 ? `+$${summary.net.toFixed(2)}` : summary.net < 0 ? `-$${Math.abs(summary.net).toFixed(2)}` : '$0.00'}
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
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className={`text-lg font-extrabold ${g.net > 0 ? 'text-green-600 dark:text-green-500' : g.net < 0 ? 'text-red-600 dark:text-red-500' : 'text-gray-500'}`}>
                          {g.net > 0 ? `+$${g.net.toFixed(2)}` : g.net < 0 ? `-$${Math.abs(g.net).toFixed(2)}` : '$0.00'}
                        </span>
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
