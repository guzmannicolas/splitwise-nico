import { useState } from 'react'
import ExpenseForm from './ExpenseForm'
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
  const [isExpanded, setIsExpanded] = useState(true)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [isEditing, setIsEditing] = useState(false)

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
    setEditingExpense(expense)
    setIsEditing(true)
  }

  const cancelEdit = () => {
    setEditingExpense(null)
    setIsEditing(false)
  }

  const handleSaveEdit = async (
    description: string,
    amount: number,
    paidBy: string,
    splitType: SplitType,
    customSplits?: Record<string, string>,
    fullBeneficiaryId?: string,
    createdAt?: string
  ) => {
    if (!editingExpense) return
    // Por ahora ignoramos createdAt ya que la función onEdit del padre no lo maneja aún
    await onEdit(editingExpense.id, description, amount, paidBy, splitType, customSplits)
    cancelEdit()
  }

  const shortId = (uid: string) => uid?.slice(0, 8) || ''

  if (expenses.length === 0) {
    return (
      <div className="bg-white shadow-xl rounded-2xl p-6 border border-blue-100">
        <h2 
          className="text-2xl font-bold text-blue-700 mb-6 cursor-pointer flex items-center justify-between hover:text-blue-800 transition-colors"
          onClick={() => setIsExpanded(!isExpanded)}
        >
          <span>Gastos</span>
          <span className="text-xl">{isExpanded ? '▼' : '▶'}</span>
        </h2>
        {isExpanded && <p className="text-gray-500 text-center">No hay gastos todavía</p>}
      </div>
    )
  }

  return (
    <div className="bg-white shadow-xl rounded-2xl p-6 border border-blue-100">
      <h2 
        className="text-2xl font-bold text-blue-700 mb-6 cursor-pointer flex items-center justify-between hover:text-blue-800 transition-colors"
        onClick={() => setIsExpanded(!isExpanded)}
      >
        <span>Gastos</span>
        <span className="text-xl">{isExpanded ? '▼' : '▶'}</span>
      </h2>
      {isExpanded && (
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
                <p className="text-xs text-gray-500 mt-1">
                  Creado por {displayNameFor(expense.created_by || expense.paid_by)} el{' '}
                  {new Date(expense.created_at).toLocaleDateString()}
                </p>
                {expense.updated_at && expense.updated_by && (
                  <p className="text-xs text-gray-400 italic mt-1">
                    Última modificación por {displayNameFor(expense.updated_by)} el{' '}
                    {new Date(expense.updated_at).toLocaleDateString()} a las{' '}
                    {new Date(expense.updated_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </p>
                )}
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
      )}

      {/* Modal de edición */}
      {isEditing && editingExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="max-w-2xl w-full">
            <ExpenseForm
              members={members}
              onSubmit={handleSaveEdit}
              onCancel={cancelEdit}
              creating={false}
              displayNameFor={displayNameFor}
              currentUserId={currentUserId || ''}
              initialData={{
                description: editingExpense.description,
                amount: editingExpense.amount.toString(),
                paidBy: editingExpense.paid_by,
                createdAt: editingExpense.created_at
              }}
              isEditMode={true}
            />
          </div>
        </div>
      )}
    </div>
  )
}
