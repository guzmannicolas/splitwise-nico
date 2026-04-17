import { useState } from 'react'
import type { Member, SplitType } from '../../lib/services/types'

interface ExpenseFormProps {
  members: Member[]
  onSubmit: (
    description: string,
    amount: number,
    paidBy: string,
    splitType: SplitType,
    customSplits?: Record<string, string>,
    fullBeneficiaryId?: string
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
  const [fullBeneficiaryId, setFullBeneficiaryId] = useState('')

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

    if (splitType === 'full') {
      if (!fullBeneficiaryId) {
        alert('Selecciona quién debe el total al pagador')
        return
      }
      if (fullBeneficiaryId === paidBy) {
        alert('El beneficiario no puede ser el mismo que pagó')
        return
      }
    }

    await onSubmit(description, amountNum, paidBy, splitType, customSplits, fullBeneficiaryId || undefined)

    // Limpiar formulario
    setDescription('')
    setAmount('')
    setPaidBy('')
    setSplitType('equal')
    setCustomSplits({})
    setFullBeneficiaryId('')
  }

  return (
    <div className="fixed inset-0 z-[60] bg-white dark:bg-slate-900 md:static md:bg-transparent md:z-auto md:p-0 flex flex-col md:block overflow-y-auto md:overflow-visible transition-all duration-300">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 border-b dark:border-slate-800 bg-white dark:bg-slate-900 sticky top-0 z-10">
        <h2 className="text-xl font-bold text-gray-800 dark:text-slate-100 italic">Dividi2</h2>
        <button 
          onClick={onCancel}
          className="p-2 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200"
          aria-label="Cerrar"
        >
          <span className="text-2xl">×</span>
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 bg-white dark:bg-slate-900 md:bg-gradient-to-br md:from-green-50 md:to-teal-50 md:dark:from-slate-800 md:dark:to-slate-800 p-6 md:rounded-xl md:border border-green-200 dark:border-slate-700 transition-all duration-300 flex-1">
        <h2 className="text-2xl font-bold text-green-700 dark:text-green-400 mb-4 md:hidden">Agregar Gasto</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase md:hidden">Descripción</label>
            <input
              type="text"
              value={description}
              onChange={e => setDescription(e.target.value)}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-slate-100"
              placeholder="¿En qué gastaste?"
              required
              disabled={creating}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase md:hidden">Monto</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-slate-100"
              placeholder="0.00"
              required
              disabled={creating}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase md:hidden">Pagado por</label>
            <select
              value={paidBy}
              onChange={e => setPaidBy(e.target.value)}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-green-500 bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-slate-100"
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
        </div>

        <div className="pt-4">
          <label className="block text-sm font-semibold text-gray-700 dark:text-slate-200 mb-2">
            ¿Cómo dividir el gasto?
          </label>
          <div className="flex flex-col gap-3 md:flex-row md:gap-4 flex-wrap text-gray-800 dark:text-slate-300">
            <label className="flex items-center gap-2 cursor-pointer p-3 border dark:border-slate-700 rounded-lg md:border-none md:p-0">
              <input
                type="radio"
                name="splitType"
                value="equal"
                checked={splitType === 'equal'}
                onChange={() => setSplitType('equal')}
                className="mr-2 h-5 w-5 md:h-4 md:w-4"
                disabled={creating}
              />
              <span>Igualitario</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer p-3 border dark:border-slate-700 rounded-lg md:border-none md:p-0">
              <input
                type="radio"
                name="splitType"
                value="full"
                checked={splitType === 'full'}
                onChange={() => setSplitType('full')}
                className="mr-2 h-5 w-5 md:h-4 md:w-4"
                disabled={creating}
              />
              <span>Liquidación Total</span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer p-3 border dark:border-slate-700 rounded-lg md:border-none md:p-0">
              <input
                type="radio"
                name="splitType"
                value="custom"
                checked={splitType === 'custom'}
                onChange={() => setSplitType('custom')}
                className="mr-2 h-5 w-5 md:h-4 md:w-4"
                disabled={creating}
              />
              <span>Personalizado</span>
            </label>
          </div>
        </div>

        {splitType === 'full' && (
          <div className="border rounded-xl p-4 bg-yellow-50 dark:bg-yellow-900/10 border-yellow-200 dark:border-yellow-900/30">
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-2">Selecciona quién debe reintegrar el 100% al pagador.</p>
            <select
              value={fullBeneficiaryId}
              onChange={e => setFullBeneficiaryId(e.target.value)}
              className="w-full p-3 border rounded-lg focus:ring-2 focus:ring-yellow-400 bg-white dark:bg-slate-700 border-gray-200 dark:border-slate-600 text-gray-900 dark:text-slate-100"
              disabled={creating || !paidBy}
              required
            >
              <option value="">Beneficiario</option>
              {members
                .filter(m => m.user_id !== paidBy)
                .map(m => (
                  <option key={m.user_id} value={m.user_id}>
                    {displayNameFor(m.user_id)}
                  </option>
                ))}
            </select>
          </div>
        )}

        {splitType === 'custom' && (
          <div className="border rounded-xl p-4 bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700">
            <p className="text-sm text-gray-600 dark:text-slate-400 mb-3">
              Ingresa los montos para cada persona
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {members.map(m => (
                <div key={m.user_id} className="flex items-center justify-between gap-4 p-2 bg-white dark:bg-slate-800 rounded-lg border dark:border-slate-700">
                  <span className="text-sm font-semibold text-gray-800 dark:text-slate-100">{displayNameFor(m.user_id)}</span>
                  <input
                    type="number"
                    step="0.01"
                    value={customSplits[m.user_id] ?? ''}
                    onChange={e =>
                      setCustomSplits(prev => ({ ...prev, [m.user_id]: e.target.value }))
                    }
                    className="w-24 p-2 border rounded bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-100 text-right"
                    placeholder="0.00"
                    disabled={creating}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="flex flex-col md:flex-row gap-3 pt-6 pb-12 md:pb-0">
          <button
            type="submit"
            disabled={creating}
            className="w-full py-4 bg-gradient-to-r from-green-600 to-teal-500 text-white font-bold rounded-xl hover:from-green-700 hover:to-teal-600 transition-all shadow-xl disabled:opacity-50 disabled:cursor-not-allowed order-1 md:order-2"
          >
            {creating ? 'Procesando...' : 'Confirmar Gasto'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={creating}
            className="w-full py-4 bg-gray-100 dark:bg-slate-800 text-gray-700 dark:text-slate-300 font-semibold rounded-xl hover:bg-gray-200 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 order-2 md:order-1"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  )
}
