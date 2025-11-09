import React from 'react'
import type { Expense, Settlement } from '../../lib/services/types'

type ActivityItem = 
  | { type: 'expense'; data: Expense; timestamp: string }
  | { type: 'settlement'; data: Settlement; timestamp: string }

type Props = {
  expenses: Expense[]
  settlements: Settlement[]
  displayNameFor: (userId: string) => string
}

export default function ActivityHistory({ expenses, settlements, displayNameFor }: Props) {
  // Combinar gastos y liquidaciones en timeline
  const activities: ActivityItem[] = [
    ...expenses.map(e => ({ type: 'expense' as const, data: e, timestamp: e.created_at })),
    ...settlements.map(s => ({ type: 'settlement' as const, data: s, timestamp: s.created_at }))
  ].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())

  return (
    <div className="bg-white shadow-xl rounded-2xl p-6 border border-blue-100">
      <h2 className="text-2xl font-bold text-blue-700 mb-4">Actividad Reciente</h2>
      
      {activities.length === 0 ? (
        <p className="text-gray-400 text-center py-8">No hay actividad aún</p>
      ) : (
        <ul className="space-y-3">
          {activities.slice(0, 15).map((item, idx) => (
            <li
              key={idx}
              className={`p-4 rounded-xl border-l-4 ${
                item.type === 'expense'
                  ? 'bg-blue-50 border-blue-500'
                  : 'bg-purple-50 border-purple-500'
              }`}
            >
              {item.type === 'expense' ? (
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-blue-600 uppercase">Gasto</span>
                    <span className="font-bold text-blue-700">${item.data.amount.toFixed(2)}</span>
                  </div>
                  <p className="font-medium text-gray-800 mt-1">{item.data.description}</p>
                  <p className="text-xs text-gray-500 mt-1">
                    Pagado por {displayNameFor(item.data.paid_by)} · {new Date(item.timestamp).toLocaleString()}
                  </p>
                </div>
              ) : (
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-purple-600 uppercase">Pago</span>
                    <span className="font-bold text-purple-700">${item.data.amount.toFixed(2)}</span>
                  </div>
                  <p className="font-medium text-gray-800 mt-1">
                    {displayNameFor(item.data.from_user_id)} → {displayNameFor(item.data.to_user_id)}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {new Date(item.timestamp).toLocaleString()}
                  </p>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
