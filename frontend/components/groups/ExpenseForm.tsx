import React, { useState, useEffect } from 'react'
import type { Member, SplitType } from '../../lib/services/types'
import { motion } from 'framer-motion'

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
      if (!fullBeneficiaryId || fullBeneficiaryId === paidBy) {
        alert('Revisa el beneficiario')
        return
      }
    }

    await onSubmit(description, amountNum, paidBy, splitType, customSplits, fullBeneficiaryId || undefined)
    // No hace falta llamar onCancel aquí si el padre lo hace en el submit
  }

  return (
    <div className="fixed inset-0 z-[100] flex justify-end overflow-hidden">
      {/* Backdrop */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-0 bg-slate-950/40 backdrop-blur-sm" 
        onClick={onCancel}
      ></motion.div>

      {/* Side Panel / Mobile Fullscreen */}
      <motion.div 
        initial={{ x: '100%' }}
        animate={{ x: 0 }}
        exit={{ x: '100%' }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="relative w-full md:max-w-lg h-full bg-white dark:bg-slate-900 shadow-2xl flex flex-col border-l border-green-100 dark:border-slate-800"
      >
        
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b dark:border-slate-800 bg-white dark:bg-slate-900 shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <span className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-lg">📝</span>
              Nuevo Gasto
            </h2>
          </div>
          <button 
            onClick={onCancel}
            className="h-10 w-10 flex items-center justify-center rounded-full bg-gray-100 dark:bg-slate-800 text-gray-500 hover:text-gray-700 dark:hover:text-white transition-all hover:rotate-90"
            aria-label="Cerrar"
          >
            <span className="text-2xl">×</span>
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest px-1">Concepto</label>
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full p-4 border rounded-2xl bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500 transition-all font-medium"
                placeholder="¿En qué se gastó el dinero?"
                required
                disabled={creating}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest px-1">Monto total</label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-bold">$</span>
                  <input
                    type="number"
                    step="0.01"
                    value={amount}
                    onChange={e => setAmount(e.target.value)}
                    className="w-full pl-8 pr-4 py-4 border rounded-2xl bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500 font-bold text-lg"
                    placeholder="0.00"
                    required
                    disabled={creating}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest px-1">Pagador</label>
                <select
                  value={paidBy}
                  onChange={e => setPaidBy(e.target.value)}
                  className="w-full p-4 border rounded-2xl bg-gray-50 dark:bg-slate-800/50 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-100 focus:ring-2 focus:ring-green-500 font-medium"
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
          </div>

          <div className="space-y-4 pt-4 border-t dark:border-slate-800">
            <h3 className="text-sm font-bold text-gray-700 dark:text-slate-200 uppercase tracking-tight">Regla de división</h3>
            <div className="grid grid-cols-1 gap-3">
              {[
                { id: 'equal', title: 'Igualitario', desc: 'Todos pagan lo mismo' },
                { id: 'full', title: 'Liquidación Total', desc: 'Una persona debe el total' },
                { id: 'custom', title: 'Personalizado', desc: 'Montos específicos p/u' },
              ].map((type) => (
                <label 
                  key={type.id}
                  className={`flex items-center gap-4 p-4 rounded-2xl border transition-all cursor-pointer ${
                    splitType === type.id 
                      ? 'border-green-500 bg-green-50 dark:bg-green-900/10 ring-1 ring-green-500' 
                      : 'border-gray-100 dark:border-slate-800 bg-white dark:bg-slate-900/50'
                  }`}
                >
                  <input
                    type="radio"
                    name="splitType"
                    value={type.id}
                    checked={splitType === type.id}
                    onChange={() => setSplitType(type.id as SplitType)}
                    className="h-5 w-5 text-green-600 focus:ring-green-500 border-gray-300"
                    disabled={creating}
                  />
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white text-sm">{type.title}</p>
                    <p className="text-xs text-gray-500 dark:text-slate-400">{type.desc}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {splitType === 'full' && (
            <div className="bg-amber-50 dark:bg-amber-900/10 border border-amber-100 dark:border-amber-900/20 rounded-2xl p-4 space-y-3">
               <label className="text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-widest px-1">¿A quién beneficia?</label>
              <select
                value={fullBeneficiaryId}
                onChange={e => setFullBeneficiaryId(e.target.value)}
                className="w-full p-4 border rounded-xl bg-white dark:bg-slate-800 border-amber-200 dark:border-amber-900/30 text-gray-900 dark:text-slate-100"
                disabled={creating || !paidBy}
                required
              >
                <option value="">Selecciona beneficiario</option>
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
            <div className="space-y-3">
              <label className="text-[10px] font-bold text-gray-400 dark:text-slate-500 uppercase tracking-widest px-1">Montos por persona</label>
              <div className="space-y-2">
                {members.map(m => (
                  <div key={m.user_id} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-slate-800/30 rounded-xl border dark:border-slate-800">
                    <span className="text-sm font-semibold text-gray-700 dark:text-slate-300">{displayNameFor(m.user_id)}</span>
                    <input
                      type="number"
                      step="0.01"
                      value={customSplits[m.user_id] ?? ''}
                      onChange={e =>
                        setCustomSplits(prev => ({ ...prev, [m.user_id]: e.target.value }))
                      }
                      className="w-24 p-2 border rounded bg-white dark:bg-slate-900 border-gray-200 dark:border-slate-700 text-gray-900 dark:text-slate-100 text-right font-bold text-sm"
                      placeholder="0.00"
                      disabled={creating}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>

        {/* Action Bottom */}
        <div className="p-6 border-t dark:border-slate-800 bg-gray-50 dark:bg-slate-900 shrink-0 space-y-3">
          <button
            type="submit"
            onClick={handleSubmit as any}
            disabled={creating}
            className="w-full py-4 bg-gradient-to-r from-green-600 to-teal-500 text-white font-bold rounded-2xl hover:from-green-700 hover:to-teal-600 transition-all shadow-xl shadow-green-500/20 disabled:opacity-50 active:scale-95 flex items-center justify-center gap-2"
          >
            {creating ? 'Procesando...' : 'Crear Gasto'}
          </button>
          <button
            type="button"
            onClick={onCancel}
            disabled={creating}
            className="w-full py-3 text-sm text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 font-bold transition-colors"
          >
            Cancelar
          </button>
        </div>
      </motion.div>
    </div>
  )
}
