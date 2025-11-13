import React from 'react'

type Expense = {
  id: string
  description: string
  amount: number
  paid_by: string
  group_id: string
  created_at: string
  profiles?: { full_name?: string }
}

type Group = { id: string; name: string }

type Props = {
  expenses: Expense[]
  groups: Group[]
}

export default function RecentExpenses({ expenses, groups }: Props) {
  return (
    <div className="bg-white shadow-xl rounded-2xl p-6 border border-blue-100">
      <h2 className="text-2xl font-bold text-blue-700 mb-4">Últimos gastos</h2>
      {expenses.length > 0 ? (
        <ul className="divide-y divide-gray-200">
          {expenses.slice(0, 15).map(e => (
            <li key={e.id} className="py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 hover:bg-blue-50 transition-colors px-2 rounded">
              <div>
                <p className="font-semibold text-gray-800">{e.description} <span className="text-gray-400 text-sm">· {new Date(e.created_at).toLocaleDateString()}</span></p>
                <p className="text-sm text-gray-500 mt-1">{groups.find(g => g.id === e.group_id)?.name || 'Grupo'} — Pagado por {e.profiles?.full_name || e.paid_by.slice(0, 8)}</p>
              </div>
              <div className="text-right">
                <p className="font-bold text-blue-700 text-lg">${e.amount.toFixed(2)}</p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-400 text-center py-4">No hay gastos recientes</p>
      )}
    </div>
  )
}
