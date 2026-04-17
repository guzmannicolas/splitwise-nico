import React, { useState } from 'react'
import type { Settlement, Balance } from '../../lib/services/types'

type Props = {
  balances: Balance[]
  settlements: Settlement[]
  members: Array<{ user_id: string; profiles?: { full_name?: string } }>
  currentUserId: string | null
  onCreateSettlement: (fromUserId: string, toUserId: string, amount: number) => void
  onDeleteSettlement: (settlementId: string) => void
  creating: boolean
  displayNameFor: (userId: string) => string
  isRefreshing?: boolean
}

export default function SettlementSection({
  balances,
  settlements,
  members,
  currentUserId,
  onCreateSettlement,
  onDeleteSettlement,
  creating,
  displayNameFor,
  isRefreshing
}: Props) {
  const [showForm, setShowForm] = useState(false)
  const [isExpanded, setIsExpanded] = useState(true)
  const [fromUserId, setFromUserId] = useState('')
  const [toUserId, setToUserId] = useState('')
  const [amount, setAmount] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!fromUserId || !toUserId || !amount) return

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Monto inválido')
      return
    }

    if (fromUserId === toUserId) {
      alert('El pagador y receptor no pueden ser la misma persona')
      return
    }

    onCreateSettlement(fromUserId, toUserId, parsedAmount)
    setFromUserId('')
    setToUserId('')
    setAmount('')
    setShowForm(false)
  }

  // Encontrar quién le debe a quién (simplificado)
  const suggestions = balances
    .filter(b => b.balance < 0)
    .map(b => {
      const debtor = b.user_id
      const owedTo = balances.find(ob => ob.user_id !== debtor && ob.balance > 0)
      return owedTo ? { from: debtor, to: owedTo.user_id, amount: Math.min(Math.abs(b.balance), owedTo.balance) } : null
    })
    .filter(s => s !== null)

  return (
    <div className="bg-white dark:bg-slate-900 shadow-xl rounded-2xl p-6 border border-blue-100 dark:border-slate-800 transition-colors">
      <h2 
        className="text-2xl font-bold text-blue-700 dark:text-blue-400 mb-4 cursor-pointer flex items-center justify-between hover:text-blue-800 dark:hover:text-indigo-300 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="flex items-center gap-3">
          <span>Liquidaciones</span>
          {isRefreshing && (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-purple-600"></div>
            </div>
          )}
        </span>
        <span className="text-xl">{isExpanded ? '▼' : '▶'}</span>
      </h2>

      {isExpanded && (
      <>

      {/* Sugerencias */}
      {suggestions.length > 0 && (
        <div className="mb-4 p-4 bg-yellow-50 dark:bg-yellow-900/10 border border-yellow-200 dark:border-yellow-900/30 rounded-lg">
          <p className="text-sm font-semibold text-yellow-800 dark:text-yellow-400 mb-2">💡 Sugerencias para saldar:</p>
          {suggestions.slice(0, 2).map((sug, idx) => (
            <p key={idx} className="text-sm text-yellow-700 dark:text-yellow-300">
              {displayNameFor(sug!.from)} debería pagar ${sug!.amount.toFixed(2)} a {displayNameFor(sug!.to)}
            </p>
          ))}
        </div>
      )}

      {/* Botón para mostrar formulario */}
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-3 bg-gradient-to-r from-purple-600 to-pink-500 text-white font-bold rounded-xl hover:from-purple-700 hover:to-pink-600 transition-all shadow-md mb-4"
        >
          + Registrar Pago
        </button>
      )}

      {/* Formulario */}
      {showForm && (
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-purple-50 dark:bg-slate-800 rounded-xl border border-purple-200 dark:border-slate-700 transition-all duration-300">
          <h3 className="font-semibold text-purple-800 dark:text-purple-400 mb-3">Registrar pago realizado</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Quién pagó:</label>
              <select
                value={fromUserId}
                onChange={e => setFromUserId(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-300 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                required
              >
                <option value="">Seleccionar miembro</option>
                {members.map(m => (
                  <option key={m.user_id} value={m.user_id}>
                    {displayNameFor(m.user_id)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Le pagó a:</label>
              <select
                value={toUserId}
                onChange={e => setToUserId(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-300 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                required
              >
                <option value="">Seleccionar miembro</option>
                {members
                  .filter(m => m.user_id !== fromUserId)
                  .map(m => (
                    <option key={m.user_id} value={m.user_id}>
                      {displayNameFor(m.user_id)}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-slate-300 mb-1">Monto:</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full p-2 border border-gray-300 dark:border-slate-600 rounded-lg focus:ring-2 focus:ring-purple-300 bg-white dark:bg-slate-700 text-gray-900 dark:text-slate-100"
                placeholder="0.00"
                required
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating}
                className="flex-1 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-all shadow-md"
              >
                {creating ? 'Guardando...' : 'Registrar'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setFromUserId('')
                  setToUserId('')
                  setAmount('')
                }}
                className="flex-1 py-2 bg-gray-300 dark:bg-slate-700 text-gray-700 dark:text-slate-200 font-semibold rounded-lg hover:bg-gray-400 dark:hover:bg-slate-600 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Lista de liquidaciones recientes */}
      <div className="mt-2">
        <h3 className="text-lg font-semibold text-gray-700 dark:text-slate-200 mb-3">Historial de pagos</h3>
        {settlements.length === 0 ? (
          <p className="text-gray-400 dark:text-slate-500 text-center py-4 italic">No hay liquidaciones registradas</p>
        ) : (
          <ul className="divide-y divide-gray-200 dark:divide-slate-800">
            {settlements
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .slice(0, 10)
              .map(s => (
                <li key={s.id} className="py-3 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-slate-800/30 px-2 rounded transition-colors group">
                  <div className="flex-1">
                    <p className="text-sm text-gray-800 dark:text-slate-100">
                      <span className="font-medium">{displayNameFor(s.from_user_id)}</span>
                      <span className="mx-2 text-gray-400 dark:text-slate-600">→</span>
                      <span className="font-medium">{displayNameFor(s.to_user_id)}</span>
                    </p>
                    <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                      {new Date(s.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="font-bold text-purple-600 dark:text-purple-400 text-lg">${s.amount.toFixed(2)}</span>
                    {currentUserId && (
                      <button
                        onClick={() => {
                          if (confirm('¿Eliminar este pago? Se registrará en auditoría.')) {
                            onDeleteSettlement(s.id)
                          }
                        }}
                        className="text-red-400 hover:text-red-600 dark:text-red-500/50 dark:hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
                        title="Eliminar pago (soft delete)"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </li>
              ))}
          </ul>
        )}
      </div>
      </>
      )}
    </div>
  )
}
