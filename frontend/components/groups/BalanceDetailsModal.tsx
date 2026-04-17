import type { DebtDetail } from '../../lib/services/types'

interface BalanceDetailsModalProps {
  isOpen: boolean
  onClose: () => void
  allDetails: DebtDetail[]
  currentUserId: string | null
  onCreateSettlement?: (fromUserId: string, toUserId: string, amount: number) => void
  creatingSettlement?: boolean
}

/**
 * Modal para mostrar detalles de deudas persona-a-persona de todo el grupo
 * Responsabilidad: presentar todas las deudas del grupo y permitir liquidaciones
 */
export default function BalanceDetailsModal({
  isOpen,
  onClose,
  allDetails,
  currentUserId,
  onCreateSettlement,
  creatingSettlement
}: BalanceDetailsModalProps) {
  if (!isOpen) return null

  // Separar deudas en categorías: mis deudas, lo que me deben, y otras
  const iOwe = allDetails.filter(d => d.from_user_id === currentUserId && d.amount > 0)
  const oweMe = allDetails.filter(d => d.to_user_id === currentUserId && d.amount > 0)
  const otherDebts = allDetails.filter(d => 
    d.from_user_id !== currentUserId && d.to_user_id !== currentUserId && d.amount > 0
  )

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-all duration-300">
      <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col border border-gray-200 dark:border-slate-800">
        {/* Header */}
        <div className="bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-slate-800 dark:to-slate-900 text-white p-6 border-b dark:border-slate-700">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-bold">Detalles de Balances</h2>
            <button
              onClick={onClose}
              className="text-white hover:text-gray-200 text-3xl leading-none transition-colors"
              aria-label="Cerrar"
            >
              ×
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 bg-white dark:bg-slate-900 transition-colors">
          {/* Deudas que yo tengo */}
          {iOwe.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-bold text-red-700 dark:text-red-400 mb-3 flex items-center gap-2">
                <span className="text-2xl">💸</span>
                Debes pagar
              </h3>
              <div className="space-y-2">
                {iOwe.map((debt, idx) => (
                  <div
                    key={idx}
                    className="bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/20 rounded-lg p-4 flex justify-between items-center transition-all"
                  >
                    <div>
                      <p className="font-semibold text-gray-800 dark:text-slate-200">
                        Le debes a <span className="text-red-700 dark:text-red-400">{debt.creditor_name}</span>
                      </p>
                      <p className="text-2xl font-bold text-red-600 dark:text-red-500">${debt.amount.toFixed(2)}</p>
                    </div>
                    {onCreateSettlement && (
                      <button
                        onClick={() =>
                          onCreateSettlement(debt.from_user_id, debt.to_user_id, debt.amount)
                        }
                        disabled={creatingSettlement}
                        className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {creatingSettlement ? 'Liquidando...' : 'Liquidar'}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Deudas a mi favor */}
          {oweMe.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-bold text-green-700 dark:text-green-400 mb-3 flex items-center gap-2">
                <span className="text-2xl">💰</span>
                Te deben
              </h3>
              <div className="space-y-2">
                {oweMe.map((debt, idx) => (
                  <div
                    key={idx}
                    className="bg-green-50 dark:bg-green-900/10 border border-green-200 dark:border-green-900/20 rounded-lg p-4 transition-all"
                  >
                    <p className="font-semibold text-gray-800 dark:text-slate-200">
                      <span className="text-green-700 dark:text-green-400">{debt.debtor_name}</span> te debe
                    </p>
                    <p className="text-2xl font-bold text-green-600 dark:text-green-500">${debt.amount.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Deudas de otros miembros */}
          {otherDebts.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-bold text-blue-700 dark:text-blue-400 mb-3 flex items-center gap-2">
                <span className="text-2xl">👥</span>
                Otras deudas del grupo
              </h3>
              <div className="space-y-2">
                {otherDebts.map((debt, idx) => (
                  <div
                    key={idx}
                    className="bg-blue-50 dark:bg-blue-900/10 border border-blue-200 dark:border-blue-900/20 rounded-lg p-4 transition-all"
                  >
                    <p className="font-semibold text-gray-800 dark:text-slate-200">
                      <span className="text-blue-700 dark:text-blue-400">{debt.debtor_name}</span> le debe a{' '}
                      <span className="text-blue-700 dark:text-blue-400">{debt.creditor_name}</span>
                    </p>
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-500">${debt.amount.toFixed(2)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Estado vacío */}
          {iOwe.length === 0 && oweMe.length === 0 && otherDebts.length === 0 && (
            <div className="text-center py-12">
              <p className="text-5xl mb-4">🎉</p>
              <p className="text-xl font-semibold text-gray-600 dark:text-slate-400">
                ¡Todo saldado! No hay deudas pendientes.
              </p>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t dark:border-slate-800 p-4 bg-gray-50 dark:bg-slate-800/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 dark:bg-slate-700 text-white font-semibold rounded-lg hover:bg-gray-700 dark:hover:bg-slate-600 transition-colors shadow-sm"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  )
}
