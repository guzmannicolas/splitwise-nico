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
  displayNameFor
}: ExpenseListProps) {
  const [expanded, setExpanded] = useState<Set<string>>(new Set())
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
      <div className="bg-white shadow-xl rounded-2xl p-6 border border-blue-100">
        <h2 className="text-2xl font-bold text-blue-700 mb-6">Gastos</h2>
        <p className="text-gray-500 text-center">No hay gastos todavía</p>
      </div>
    )
  }

  return (
    <div className="bg-white shadow-xl rounded-2xl p-6 border border-blue-100">
      <h2 className="text-2xl font-bold text-blue-700 mb-6">Gastos</h2>
      <div className="space-y-4">
        {expenses.map(expense => (
          <div
            key={expense.id}
            className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-200 rounded-xl p-4"
          >
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3">
              <div className="flex-1">
                <p className="font-bold text-lg text-gray-800">{expense.description}</p>
                <p className="text-sm text-gray-600 mt-1">
                  Pagado por{' '}
                  <span className="font-semibold">
                    {expense.profiles?.full_name ||
                      (currentUserId && expense.paid_by === currentUserId
                        ? 'Tú'
                        : shortId(expense.paid_by))}
                  </span>
                </p>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(expense.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-xl font-extrabold text-blue-700">
                  ${expense.amount.toFixed(2)}
                </p>
                <button
                  onClick={() => startEdit(expense)}
                  className="text-sm px-3 py-1 bg-blue-200 hover:bg-blue-300 rounded-lg transition-colors"
                  title="Editar gasto"
                >
                  ✏️
                </button>
                <button
                  onClick={() => toggleExpand(expense.id)}
                  className="text-sm px-3 py-1 bg-indigo-200 text-indigo-800 hover:bg-indigo-300 rounded-lg transition-colors font-semibold"
                >
                  {expanded.has(expense.id) ? 'Ocultar' : 'Ver detalles'}
                </button>
                <button
                  onClick={() => onDelete(expense.id)}
                  className="text-sm px-3 py-1 bg-red-200 hover:bg-red-300 rounded-lg transition-colors"
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
                className="mt-3 space-y-3 bg-gray-50 rounded p-3"
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  <input
                    type="text"
                    value={editDesc}
                    onChange={e => setEditDesc(e.target.value)}
                    className="p-2 border rounded"
                    placeholder="Descripción"
                    required
                  />
                  <input
                    type="number"
                    step="0.01"
                    value={editAmount}
                    onChange={e => setEditAmount(e.target.value)}
                    className="p-2 border rounded"
                    placeholder="Monto"
                    required
                  />
                  <select
                    value={editPaidBy}
                    onChange={e => setEditPaidBy(e.target.value)}
                    className="p-2 border rounded"
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
                  <div className="flex gap-4 flex-wrap text-sm">
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
                          className="flex items-center justify-between gap-2"
                        >
                          <span className="text-sm">{displayNameFor(m.user_id)}</span>
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
                            className="w-32 p-2 border rounded"
                            placeholder="0.00"
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    type="submit"
                    className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700"
                  >
                    Guardar
                  </button>
                  <button
                    type="button"
                    onClick={cancelEdit}
                    className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300"
                  >
                    Cancelar
                  </button>
                </div>
              </form>
            )}

            {/* Detalles expandidos */}
            {expanded.has(expense.id) && (
              <div className="mt-3 bg-gray-50 rounded p-3">
                <p className="text-sm text-gray-600 mb-2">División de este gasto</p>
                <ul className="space-y-1">
                  {members.map(m => {
                    const split = splits.find(
                      s => s.expense_id === expense.id && s.user_id === m.user_id
                    )
                    const amount = split ? split.amount : 0
                    const name = displayNameFor(m.user_id)
                    return (
                      <li
                        key={m.user_id}
                        className="flex items-center justify-between text-sm"
                      >
                        <span>{name}</span>
                        <span className={amount > 0 ? 'text-red-600' : 'text-gray-500'}>
                          {amount > 0 ? `debe $${amount.toFixed(2)}` : '(no debe)'}
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
    </div>
  )
}
