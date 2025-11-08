import { useState } from 'react'
import type { Member, SplitType } from '../../lib/services/types'

interface ExpenseFormProps {
  members: Member[]
  onSubmit: (
    description: string,
    amount: number,
    paidBy: string,
    splitType: SplitType,
    customSplits?: Record<string, string>
  ) => Promise<void>
  onCancel: () => void
  creating: boolean
  displayNameFor: (userId: string) => string
}

/**
 * Componente para crear nuevos gastos
 * Responsabilidad única: Formulario de creación de gastos
 */
export default function ExpenseForm({
  members,
  onSubmit,
  onCancel,
  creating,
  displayNameFor
}: ExpenseFormProps) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState('')
  const [splitType, setSplitType] = useState<SplitType>('equal')
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({})

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    const amountNum = parseFloat(amount)
    if (isNaN(amountNum) || amountNum <= 0) {
      alert('Monto inválido')
      return
    }

    if (!paidBy) {
      alert('Selecciona quién pagó')
      return
    }

    await onSubmit(description, amountNum, paidBy, splitType, customSplits)

    // Limpiar formulario
    setDescription('')
    setAmount('')
    setPaidBy('')
    setSplitType('equal')
    setCustomSplits({})
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 bg-gradient-to-br from-green-50 to-teal-50 p-6 rounded-xl border border-green-200">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <input
          type="text"
          value={description}
          onChange={e => setDescription(e.target.value)}
          className="p-3 border rounded-lg focus:ring-2 focus:ring-green-500"
          placeholder="Descripción del gasto"
          required
          disabled={creating}
        />
        <input
          type="number"
          step="0.01"
          value={amount}
          onChange={e => setAmount(e.target.value)}
          className="p-3 border rounded-lg focus:ring-2 focus:ring-green-500"
          placeholder="Monto"
          required
          disabled={creating}
        />
        <select
          value={paidBy}
          onChange={e => setPaidBy(e.target.value)}
          className="p-3 border rounded-lg focus:ring-2 focus:ring-green-500"
          required
          disabled={creating}
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
        <label className="block text-sm font-semibold text-gray-700 mb-2">
          ¿Cómo dividir el gasto?
        </label>
        <div className="flex gap-4 flex-wrap">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="splitType"
              value="equal"
              checked={splitType === 'equal'}
              onChange={() => setSplitType('equal')}
              className="mr-2"
              disabled={creating}
            />
            <span>Igualitario (todos pagan lo mismo)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="splitType"
              value="full"
              checked={splitType === 'full'}
              onChange={() => setSplitType('full')}
              className="mr-2"
              disabled={creating}
            />
            <span>Solo el pagador (gasto personal)</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="splitType"
              value="custom"
              checked={splitType === 'custom'}
              onChange={() => setSplitType('custom')}
              className="mr-2"
              disabled={creating}
            />
            <span>Montos personalizados</span>
          </label>
        </div>
      </div>

      {splitType === 'custom' && (
        <div className="border rounded p-3 bg-gray-50">
          <p className="text-sm text-gray-600 mb-2">
            Ingresa los montos para cada persona (deben sumar el total)
          </p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {members.map(m => (
              <div key={m.user_id} className="flex items-center justify-between gap-2">
                <span className="text-sm">{displayNameFor(m.user_id)}</span>
                <input
                  type="number"
                  step="0.01"
                  value={customSplits[m.user_id] ?? ''}
                  onChange={e =>
                    setCustomSplits(prev => ({ ...prev, [m.user_id]: e.target.value }))
                  }
                  className="w-32 p-2 border rounded"
                  placeholder="0.00"
                  disabled={creating}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={creating}
          className="flex-1 py-3 bg-gradient-to-r from-green-600 to-teal-500 text-white font-bold rounded-lg hover:from-green-700 hover:to-teal-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {creating ? 'Creando...' : 'Crear Gasto'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          disabled={creating}
          className="flex-1 py-3 bg-gray-200 font-semibold rounded-lg hover:bg-gray-300 transition-colors disabled:opacity-50"
        >
          Cancelar
        </button>
      </div>
    </form>
  )
}
