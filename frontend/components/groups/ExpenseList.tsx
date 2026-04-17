import { useState } from 'react'
import type { Expense, ExpenseSplit, Member, SplitType } from '../../lib/services/types'

interface ExpenseListProps {
  expenses: Expense[]
  splits: ExpenseSplit[]
  members: Member[]
  currentUserId: string | null
  onEdit: (
    expenseId: string,
    description: string,
    amount: number,
    paidBy: string,
    splitType: SplitType,
    customSplits?: Record<string, string>
  ) => Promise<void>
  onDelete: (expenseId: string) => Promise<void>
  displayNameFor: (userId: string) => string
  isRefreshing?: boolean
}

/**
 * Componente para mostrar la lista de gastos
 * Responsabilidad única: Visualización y edición de gastos
 */
export default function ExpenseList({
  expenses,
  splits,
  members,
  currentUserId,
  onEdit,
  onDelete,
  displayNameFor,
  isRefreshing
}: ExpenseListProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
  const [isExpanded, setIsExpanded] = useState(true)
  const [editingId, setEditingId] = useState<string>('')
  const [editDesc, setEditDesc] = useState('')
  const [editAmount, setEditAmount] = useState('')
  const [editPaidBy, setEditPaidBy] = useState('')
  const [editSplitType, setEditSplitType] = useState<SplitType>('equal')
  const [editCustomSplits, setEditCustomSplits] = useState<Record<string, string>>({})

  const toggleExpand = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  const startEdit = (expense: Expense) => {
    setEditingId(expense.id)
    setEditDesc(expense.description)
    setEditAmount(expense.amount.toString())
    setEditPaidBy(expense.paid_by)
    setEditSplitType('equal')
    setEditCustomSplits({})
  }

  const cancelEdit = () => {
    setEditingId('')
    setEditDesc('')
    setEditAmount('')
    setEditPaidBy('')
    setEditSplitType('equal')
    setEditCustomSplits({})
  }

  const handleSaveEdit = async (expenseId: string, e: React.FormEvent) => {
    e.preventDefault()
    const amount = parseFloat(editAmount)
    if (isNaN(amount) || amount <= 0) {
      alert('Monto inválido')
      return
    }
    if (!editPaidBy) {
      alert('Selecciona quién pagó')
      return
    }

    await onEdit(expenseId, editDesc, amount, editPaidBy, editSplitType, editCustomSplits)
    cancelEdit()
  }

  const shortId = (uid: string) => uid?.slice(0, 8) || ''

  if (expenses.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 shadow-xl rounded-2xl p-6 border border-blue-100 dark:border-slate-800 transition-colors">
        <h2 
          className="text-2xl font-bold text-blue-700 dark:text-blue-400 mb-6 cursor-pointer flex items-center justify-between hover:text-blue-800 dark:hover:text-indigo-300 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span>Gastos</span>
          <span className="text-xl">{isExpanded ? '▼' : '▶'}</span>
        </h2>
        {isExpanded && <p className="text-gray-500 dark:text-slate-400 text-center">No hay gastos todavía</p>}
      </div>
    )
  }

  return (
    <div className="bg-white dark:bg-slate-900 shadow-xl rounded-2xl p-6 border border-blue-100 dark:border-slate-800 transition-colors">
      <h2 
        className="text-2xl font-bold text-blue-700 dark:text-blue-400 mb-6 cursor-pointer flex items-center justify-between hover:text-blue-800 dark:hover:text-indigo-300 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span className="flex items-center gap-3">
          <span>Gastos</span>
          {isRefreshing && (
            <div className="flex items-center">
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
              <span className="ml-2 text-xs font-normal text-blue-500 hidden sm:inline">Actualizando...</span>
            </div>
          )}
        </span>
        <span className="text-xl">{isExpanded ? '▼' : '▶'}</span>
      </h2>
      {isExpanded && (
      <div className="space-y-4">
        {expenses.map(expense => (
          <div
            key={expense.id}
            className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-800 border border-blue-200 dark:border-slate-700 rounded-xl p-4 transition-all"
          >
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
              <div className="flex-1">
                <p className="font-bold text-lg text-gray-800 dark:text-slate-100">{expense.description}</p>
                <p className="text-sm text-gray-600 dark:text-slate-400 mt-1">
                  Pagado por{' '}
                  <span className="font-semibold text-gray-900 dark:text-slate-200">
                    {expense.profiles?.full_name ||
                      (currentUserId && expense.paid_by === currentUserId
                        ? 'Tú'
                        : shortId(expense.paid_by))}
                  </span>
                </p>
                <p className="text-xs text-gray-500 dark:text-slate-500 mt-1">
                  Creado por {displayNameFor(expense.created_by || expense.paid_by)} el{' '}
                  {new Date(expense.created_at).toLocaleDateString()}
                </p>
                {expense.updated_at && expense.updated_by && (
                  <p className="text-xs text-gray-400 dark:text-slate-600 italic mt-1">
                    Última modificación por {displayNameFor(expense.updated_by)} el{' '}
                    {new Date(expense.updated_at).toLocaleDateString()} a las{' '}
                    {new Date(expense.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xl font-extrabold text-blue-700 dark:text-blue-400">
                  ${expense.amount.toFixed(2)}
                </p>
                <button
                  onClick={() => startEdit(expense)}
                  className="text-sm px-3 py-1 bg-blue-200 dark:bg-slate-700 hover:bg-blue-300 dark:hover:bg-slate-650 rounded-lg transition-colors"
                  title="Editar gasto"
                >
                  ✏️
                </button>
                <button
                  onClick={() => toggleExpand(expense.id)}
                  className="text-sm px-3 py-1 bg-indigo-200 dark:bg-indigo-900/30 text-indigo-800 dark:text-indigo-300 hover:bg-indigo-300 dark:hover:bg-indigo-900/50 rounded-lg transition-colors font-semibold"
                >
                  {expanded.has(expense.id) ? 'Ocultar' : 'Ver detalles'}
                </button>
                <button
                  onClick={() => onDelete(expense.id)}
                  className="text-sm px-3 py-1 bg-red-200 dark:bg-red-900/30 text-red-800 dark:text-red-400 hover:bg-red-300 dark:hover:bg-red-900/50 rounded-lg transition-colors"
                  title="Eliminar gasto"
                >
                  🗑️
                </button>
              </div>
            </div>

            {/* Editor inline */}
            {editingId === expense.id && (
              <form
                onSubmit={e => handleSaveEdit(expense.id, e)}
                className="mt-3 space-y-3 bg-gray-50 dark:bg-slate-900/50 rounded p-4 border border-blue-100 dark:border-slate-700"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={editDesc}
                    onChange={e => setEditDesc(e.target.value)}
                    className="p-2 border rounded bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-100"
                    placeholder="Descripción"
                    required
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={editAmount}
                    onChange={e => setEditAmount(e.target.value)}
                    className="p-2 border rounded bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-100"
                    placeholder="Monto"
                    required
                  />
                  <select
                    value={editPaidBy}
                    onChange={e => setEditPaidBy(e.target.value)}
                    className="p-2 border rounded bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-100"
                  >
                    <option value="">¿Quién pagó?</option>
                    {members.map(m => (
                      <option key={m.user_id} value={m.user_id}>
                        {displayNameFor(m.user_id)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <div className="flex gap-4 flex-wrap text-sm text-gray-700 dark:text-slate-300">
                    <label className="flex items-center gap-1">
                      <input
                        type="radio"
                        name={`editSplitType-${expense.id}`}
                        value="equal"
                        checked={editSplitType === 'equal'}
                        onChange={() => setEditSplitType('equal')}
                      />
                      Igualitario
                    </label>
                    <label className="flex items-center gap-1">
                      <input
                        type="radio"
                        name={`editSplitType-${expense.id}`}
                        value="full"
                        checked={editSplitType === 'full'}
                        onChange={() => setEditSplitType('full')}
                      />
                      Full al pagador
                    </label>
                    <label className="flex items-center gap-1">
                      <input
                        type="radio"
                        name={`editSplitType-${expense.id}`}
                        value="custom"
                        checked={editSplitType === 'custom'}
                        onChange={() => setEditSplitType('custom')}
                      />
                      Personalizado
                    </label>
                  </div>
                  {editSplitType === 'custom' && (
                    <div className="mt-2 grid grid-cols-1 md:grid-cols-2 gap-2">
                      {members.map(m => (
                        <div
                          key={m.user_id}
                          className="flex items-center justify-between gap-2 border-b dark:border-slate-800 pb-1"
                        >
                          <span className="text-sm text-gray-700 dark:text-slate-200">{displayNameFor(m.user_id)}</span>
                          <input
                            type="number"
                            step="0.01"
                            value={editCustomSplits[m.user_id] ?? ''}
                            onChange={e =>
                              setEditCustomSplits(prev => ({
                                ...prev,
                                [m.user_id]: e.target.value
                              }))
                            }
                            className="w-32 p-2 border rounded bg-white dark:bg-slate-800 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-100"
                            placeholder="0.00"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="submit"
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-bold transition-all shadow-md"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="flex-1 px-4 py-2 bg-gray-200 dark:bg-slate-700 text-gray-700 dark:text-slate-100 rounded-lg hover:bg-gray-300 dark:hover:bg-slate-600 transition-colors"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            {/* Detalles expandidos */}
            {expanded.has(expense.id) && (
              <div className="mt-3 bg-white/50 dark:bg-slate-900/30 rounded-xl p-4 border border-blue-100 dark:border-slate-700 transition-all">
                <p className="text-sm font-bold text-gray-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                   <span>📊</span> División de este gasto
                </p>
                <ul className="space-y-2">
                  {members.map(m => {
                    const split = splits.find(
                      s => s.expense_id === expense.id && s.user_id === m.user_id
                    )
                    const amount = split ? split.amount : 0
                    const name = displayNameFor(m.user_id)
                    return (
                      <li
                        key={m.user_id}
                        className="flex items-center justify-between text-sm py-1 border-b border-blue-50 dark:border-slate-800 last:border-0"
                      >
                        <span className="text-gray-700 dark:text-slate-300">{name}</span>
                        <span className={`font-semibold ${amount > 0.01 ? 'text-red-500 dark:text-red-400' : 'text-gray-400 dark:text-slate-500'}`}>
                          {amount > 0.01 ? `debe $${amount.toFixed(2)}` : '(no debe)'}
                        </span>
                      </li>
                    )
                  })}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>
      )}
    </div>
  )
}
