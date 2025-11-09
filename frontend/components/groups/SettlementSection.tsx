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
}

export default function SettlementSection({
  balances,
  settlements,
  members,
  currentUserId,
  onCreateSettlement,
  onDeleteSettlement,
  creating,
  displayNameFor
}: Props) {
  const [showForm, setShowForm] = useState(false)
  const [toUserId, setToUserId] = useState('')
  const [amount, setAmount] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!currentUserId || !toUserId || !amount) return

    const parsedAmount = parseFloat(amount)
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      alert('Monto inválido')
      return
    }

    onCreateSettlement(currentUserId, toUserId, parsedAmount)
    setToUserId('')
    setAmount('')
    setShowForm(false)
  }

  // Encontrar quién le debe a quién (simplificado)
  const suggestions = balances
    .filter(b => b.user_id === currentUserId && b.balance < 0)
    .map(b => {
      const owedTo = balances.find(ob => ob.user_id !== currentUserId && ob.balance > 0)
      return owedTo ? { to: owedTo.user_id, amount: Math.min(Math.abs(b.balance), owedTo.balance) } : null
    })
    .filter(s => s !== null)

  return (
    <div className="bg-white shadow-xl rounded-2xl p-6 border border-blue-100">
      <h2 className="text-2xl font-bold text-blue-700 mb-4">Liquidaciones</h2>

      {/* Sugerencias */}
      {suggestions.length > 0 && (
        <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
          <p className="text-sm font-semibold text-yellow-800 mb-2">💡 Sugerencias para saldar:</p>
          {suggestions.slice(0, 2).map((sug, idx) => (
            <p key={idx} className="text-sm text-yellow-700">
              Pagale ${sug!.amount.toFixed(2)} a {displayNameFor(sug!.to)}
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
        <form onSubmit={handleSubmit} className="mb-6 p-4 bg-purple-50 rounded-xl border border-purple-200">
          <h3 className="font-semibold text-purple-800 mb-3">Registrar pago realizado</h3>
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Le pagaste a:</label>
              <select
                value={toUserId}
                onChange={e => setToUserId(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-300"
                required
              >
                <option value="">Seleccionar miembro</option>
                {members
                  .filter(m => m.user_id !== currentUserId)
                  .map(m => (
                    <option key={m.user_id} value={m.user_id}>
                      {displayNameFor(m.user_id)}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Monto:</label>
              <input
                type="number"
                step="0.01"
                min="0.01"
                value={amount}
                onChange={e => setAmount(e.target.value)}
                className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-300"
                placeholder="0.00"
                required
              />
            </div>
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={creating}
                className="flex-1 py-2 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 disabled:opacity-50 transition-colors"
              >
                {creating ? 'Guardando...' : 'Registrar'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowForm(false)
                  setToUserId('')
                  setAmount('')
                }}
                className="flex-1 py-2 bg-gray-300 text-gray-700 font-semibold rounded-lg hover:bg-gray-400 transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Lista de liquidaciones recientes */}
      <div>
        <h3 className="text-lg font-semibold text-gray-700 mb-3">Historial de pagos</h3>
        {settlements.length === 0 ? (
          <p className="text-gray-400 text-center py-4">No hay liquidaciones registradas</p>
        ) : (
          <ul className="divide-y divide-gray-200">
            {settlements
              .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
              .slice(0, 10)
              .map(s => (
                <li key={s.id} className="py-3 flex items-center justify-between hover:bg-gray-50 px-2 rounded">
                  <div className="flex-1">
                    <p className="text-sm text-gray-800">
                      <span className="font-medium">{displayNameFor(s.from_user_id)}</span>
                      {' → '}
                      <span className="font-medium">{displayNameFor(s.to_user_id)}</span>
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {new Date(s.created_at).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-purple-600">${s.amount.toFixed(2)}</span>
                    {currentUserId === s.from_user_id && (
                      <button
                        onClick={() => onDeleteSettlement(s.id)}
                        className="text-red-500 hover:text-red-700 text-sm font-semibold"
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
    </div>
  )
}
