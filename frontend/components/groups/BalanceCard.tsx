import type { Balance } from '../../lib/services/types'

interface BalanceCardProps {
  balances: Balance[]
}

/**
 * Componente para mostrar los balances de los miembros
 * Responsabilidad única: Visualización de balances
 */
export default function BalanceCard({ balances }: BalanceCardProps) {
  if (balances.length === 0) {
    return null
  }

  return (
    <div className="bg-white shadow-xl rounded-2xl p-6 border border-purple-100">
      <h2 className="text-2xl font-bold text-purple-700 mb-4">Balances</h2>
      <div className="space-y-3">
        {balances.map(b => (
          <div
            key={b.user_id}
            className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200"
          >
            <span className="font-semibold text-gray-800">{b.name}</span>
            <span
              className={`text-lg font-bold ${
                b.balance > 0.01
                  ? 'text-green-600'
                  : b.balance < -0.01
                  ? 'text-red-600'
                  : 'text-gray-500'
              }`}
            >
              {b.balance > 0.01
                ? `+$${b.balance.toFixed(2)}`
                : b.balance < -0.01
                ? `-$${Math.abs(b.balance).toFixed(2)}`
                : 'Liquidado'}
            </span>
          </div>
        ))}
      </div>
      <div className="mt-4 p-3 bg-gray-50 rounded text-sm text-gray-600">
        <p>
          <strong>+</strong> = Le deben dinero
        </p>
        <p>
          <strong>-</strong> = Debe dinero
        </p>
      </div>
    </div>
  )
}
