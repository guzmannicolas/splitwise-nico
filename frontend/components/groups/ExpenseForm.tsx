import { useState, useEffect } from 'react'
import DivisionModal from './DivisionModal'
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
  currentUserId: string
}

type PayerMode = 'single' | 'multiple' | 'each-own'

/**
 * Componente para crear nuevos gastos
 * Responsabilidad única: Formulario de creación de gastos
 */
export default function ExpenseForm({
  members,
  onSubmit,
  onCancel,
  creating,
  displayNameFor,
  currentUserId
}: ExpenseFormProps) {
  const [description, setDescription] = useState('')
  const [amount, setAmount] = useState('')
  const [paidBy, setPaidBy] = useState(currentUserId)
  const [splitType, setSplitType] = useState<SplitType>('equal')
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({})
  const [fullBeneficiaryId, setFullBeneficiaryId] = useState('')
  
  // Nuevos estados para el diseño mejorado
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(
    members.map(m => m.user_id)
  )
  const [showPayerModal, setShowPayerModal] = useState(false)
  const [payerMode, setPayerMode] = useState<PayerMode>('single')
  const [multiplePayerAmounts, setMultiplePayerAmounts] = useState<Record<string, string>>({})
  const [showParticipantSelector, setShowParticipantSelector] = useState(false)
  const [showDivisionModal, setShowDivisionModal] = useState(false)

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
    setPaidBy(currentUserId)
    setSplitType('equal')
    setCustomSplits({})
    setFullBeneficiaryId('')
    setSelectedParticipants(members.map(m => m.user_id))
    setPayerMode('single')
    setMultiplePayerAmounts({})
  }

  const toggleParticipant = (userId: string) => {
    setSelectedParticipants(prev => 
      prev.includes(userId) 
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    )
  }

  const handlePayerModeChange = (mode: PayerMode) => {
    setPayerMode(mode)
    if (mode === 'single') {
      setPaidBy(currentUserId)
      setSplitType('equal')
    } else if (mode === 'each-own') {
      setSplitType('equal')
      // En este modo, cada persona paga su parte igual
    } else if (mode === 'multiple') {
      setSplitType('custom')
    }
  }

  const getPayerDisplayText = () => {
    if (payerMode === 'single') {
      return displayNameFor(paidBy)
    } else if (payerMode === 'multiple') {
      return 'varias personas'
    } else {
      return 'Cada persona pagó su parte'
    }
  }

  const calculateEqualSplitAmount = () => {
    const amountNum = parseFloat(amount) || 0
    if (selectedParticipants.length === 0) return 0
    return amountNum / selectedParticipants.length
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="space-y-5 bg-white p-4 sm:p-6 md:p-8 rounded-2xl shadow-lg max-w-lg mx-auto animate-slideUp">
        {/* Header */}
        <div className="flex items-center justify-between border-b pb-4">
          <h2 className="text-lg sm:text-xl font-bold text-gray-800">Añadir un gasto</h2>
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 text-2xl leading-none transition-colors"
            disabled={creating}
          >
            ×
          </button>
        </div>

        {/* Con tú y selector */}
        <div className="space-y-2">
          <label className="text-sm text-gray-600">Con tú y:</label>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowParticipantSelector(!showParticipantSelector)}
              className="w-full flex items-center gap-2 p-3 border border-gray-300 rounded-lg hover:border-teal-500 transition-all duration-200 bg-white hover:shadow-md"
              disabled={creating}
            >
              <span className="text-xl">👥</span>
              <span className="text-gray-700 flex-1 text-left text-sm sm:text-base">
                {selectedParticipants.length === members.length 
                  ? 'Todos los de ' + (members[0] ? 'Testeo' : 'grupo')
                  : `${selectedParticipants.length} persona${selectedParticipants.length !== 1 ? 's' : ''}`
                }
              </span>
              <span className="text-gray-400">×</span>
            </button>

            {/* Dropdown de participantes */}
            {showParticipantSelector && (
              <div className="absolute z-10 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto animate-slideUp">
                {members.map(member => (
                  <label
                    key={member.user_id}
                    className="flex items-center gap-3 p-3 hover:bg-teal-50 cursor-pointer transition-colors duration-150"
                  >
                    <input
                      type="checkbox"
                      checked={selectedParticipants.includes(member.user_id)}
                      onChange={() => toggleParticipant(member.user_id)}
                      className="w-4 h-4 text-teal-600 rounded focus:ring-teal-500"
                    />
                    <span className="text-gray-700 text-sm sm:text-base">{displayNameFor(member.user_id)}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Descripción y Monto */}
        <div className="space-y-4">
          <div className="flex items-start gap-3 sm:gap-4">
            <div className="bg-gradient-to-br from-gray-100 to-gray-200 p-3 rounded-lg shadow-sm">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="flex-1">
              <input
                type="text"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full text-gray-500 text-sm sm:text-base border-0 border-b border-gray-200 focus:border-teal-500 focus:outline-none py-2 transition-colors"
                placeholder="Introduce una descripción"
                required
                disabled={creating}
              />
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-xl sm:text-2xl text-gray-700">$</span>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  className="text-3xl sm:text-4xl font-light text-gray-700 border-0 focus:outline-none w-full transition-all"
                  placeholder="0.00"
                  required
                  disabled={creating}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Pagado por */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600">Pagado por</span>
            <button
              type="button"
              onClick={() => setShowPayerModal(true)}
              className="flex items-center gap-2 text-teal-600 hover:text-teal-700 font-medium"
              disabled={creating}
            >
              <span className="text-lg">👤</span>
              <span>{getPayerDisplayText()}</span>
            </button>
          </div>
          <div className="text-xs sm:text-sm text-gray-500 flex flex-wrap items-center gap-2 mt-2">
            <span>y dividido</span>
            <button
              type="button"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-teal-100 to-teal-200 text-teal-700 font-semibold shadow-sm hover:shadow-md hover:from-teal-200 hover:to-teal-300 transition-all duration-200 transform hover:scale-105"
              onClick={() => setShowDivisionModal(true)}
              disabled={creating}
            >
              <span className="text-base sm:text-lg">⚡</span>
              <span className="text-xs sm:text-sm">
                {splitType === 'equal' ? 'a partes iguales' : splitType === 'custom' ? 'por monto' : splitType === 'percent' ? 'por porcentaje' : 'cada uno paga su parte'}
              </span>
            </button>
            <span>.</span>
            {selectedParticipants.length > 0 && amount && splitType === 'equal' && (
              <span className="text-xs text-teal-600 font-medium">
                (${calculateEqualSplitAmount().toFixed(2)}/persona)
              </span>
            )}
          </div>
        </div>

        {/* Fecha y opciones adicionales */}
        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button
            type="button"
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gray-100 text-gray-600 rounded-full text-xs sm:text-sm hover:bg-gray-200 transition-all duration-200 hover:shadow-md"
            disabled={creating}
          >
            📅 {new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}
          </button>
          <button
            type="button"
            className="flex-1 sm:flex-none px-3 sm:px-4 py-2 bg-gray-100 text-gray-600 rounded-full text-xs sm:text-sm hover:bg-gray-200 transition-all duration-200 hover:shadow-md"
            disabled={creating}
          >
            🖼️ Imagen/notas
          </button>
        </div>

        {/* Categoría */}
        <button
          type="button"
          className="w-full px-4 py-3 bg-gradient-to-br from-gray-50 to-gray-100 text-gray-600 rounded-lg text-sm hover:from-gray-100 hover:to-gray-200 transition-all duration-200 border border-gray-200"
          disabled={creating}
        >
          🏷️ Testeo
        </button>

        {/* Botones de acción */}
        <div className="flex flex-col sm:flex-row gap-3 pt-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={creating}
            className="w-full sm:w-auto flex-1 py-3 bg-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-300 transition-all duration-200 disabled:opacity-50"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={creating}
            className="w-full sm:w-auto flex-1 py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold rounded-lg hover:from-teal-600 hover:to-teal-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {creating ? '⏳ Guardando...' : '✓ Guardar'}
          </button>
        </div>
      </form>

  {/* Modal de selección de pagador */}
      {/* Modal de división de gasto */}
      <DivisionModal
        open={showDivisionModal}
        onClose={() => setShowDivisionModal(false)}
        amount={parseFloat(amount) || 0}
        members={members}
        selectedParticipants={selectedParticipants}
        displayNameFor={displayNameFor}
        onApply={(splits, type) => {
          setShowDivisionModal(false)
          setSplitType(type)
          setCustomSplits(Object.fromEntries(Object.entries(splits).map(([k, v]) => [k, v.toString()])))
        }}
      />
      {showPayerModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto animate-slideUp">
            <div className="sticky top-0 bg-white border-b p-4 flex items-center justify-between">
              <h3 className="text-lg sm:text-xl font-bold text-gray-800">Elige el pagador</h3>
              <button
                type="button"
                onClick={() => setShowPayerModal(false)}
                className="text-gray-500 hover:text-gray-700 text-2xl leading-none transition-colors"
              >
                ×
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Selección de persona individual */}
              <div className="space-y-2">
                {members.map(member => (
                  <button
                    key={member.user_id}
                    type="button"
                    onClick={() => {
                      handlePayerModeChange('single')
                      setPaidBy(member.user_id)
                      setShowPayerModal(false)
                    }}
                    className={`w-full flex items-center gap-3 p-3 rounded-lg border transition-all duration-200 ${
                      payerMode === 'single' && paidBy === member.user_id
                        ? 'border-teal-500 bg-teal-50 shadow-md'
                        : 'border-gray-200 hover:border-teal-300 hover:bg-teal-50'
                    }`}
                  >
                    <div className="w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center text-white font-semibold shadow-sm">
                      {displayNameFor(member.user_id).charAt(0)}
                    </div>
                    <span className="text-sm sm:text-base text-gray-800 font-medium">
                      {displayNameFor(member.user_id)}
                    </span>
                  </button>
                ))}
              </div>

              {/* Separador */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-semibold text-gray-600 mb-3">Varias personas</h4>
              </div>

              {/* Cada persona pagó su parte */}
              <div className="space-y-2">
                <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:border-teal-300">
                  <input
                    type="checkbox"
                    checked={payerMode === 'each-own'}
                    onChange={(e) => {
                      if (e.target.checked) {
                        handlePayerModeChange('each-own')
                      }
                    }}
                    className="w-5 h-5 mt-0.5 text-teal-600 rounded focus:ring-teal-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">Cada persona pagó su parte</div>
                  </div>
                </label>

                {payerMode === 'each-own' && (
                  <div className="ml-8 space-y-2 bg-gray-50 p-3 rounded-lg">
                    {selectedParticipants.map(userId => {
                      const member = members.find(m => m.user_id === userId)
                      if (!member) return null
                      const equalAmount = calculateEqualSplitAmount()
                      return (
                        <div key={userId} className="flex items-center justify-between">
                          <span className="text-sm text-gray-700">{displayNameFor(userId)}</span>
                          <div className="flex items-center gap-2">
                            <span className="text-lg">$</span>
                            <input
                              type="number"
                              step="0.01"
                              value={equalAmount.toFixed(2)}
                              readOnly
                              className="w-24 px-2 py-1 bg-white border border-gray-300 rounded text-right"
                            />
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Varias personas (custom) */}
              <div className="space-y-2">
                <label className="flex items-start gap-3 p-3 border rounded-lg cursor-pointer hover:border-teal-300">
                  <input
                    type="checkbox"
                    checked={payerMode === 'multiple'}
                    onChange={(e) => {
                      if (e.target.checked) {
                        handlePayerModeChange('multiple')
                      }
                    }}
                    className="w-5 h-5 mt-0.5 text-teal-600 rounded focus:ring-teal-500"
                  />
                  <div className="flex-1">
                    <div className="font-medium text-gray-800">Varias personas (cantidades distintas)</div>
                    <div className="text-sm text-gray-500 mt-1">Especifica cuánto pagó cada persona</div>
                  </div>
                </label>

                {payerMode === 'multiple' && (
                  <div className="ml-8 space-y-2 bg-gray-50 p-3 rounded-lg">
                    {members.map(member => (
                      <div key={member.user_id} className="flex items-center justify-between">
                        <span className="text-sm text-gray-700">{displayNameFor(member.user_id)}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-lg">$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={multiplePayerAmounts[member.user_id] || ''}
                            onChange={(e) => {
                              setMultiplePayerAmounts(prev => ({
                                ...prev,
                                [member.user_id]: e.target.value
                              }))
                            }}
                            className="w-24 px-2 py-1 border border-gray-300 rounded text-right"
                            placeholder="0.00"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Botón de cerrar */}
              <button
                type="button"
                onClick={() => setShowPayerModal(false)}
                className="w-full py-3 bg-gradient-to-r from-teal-500 to-teal-600 text-white font-semibold rounded-lg hover:from-teal-600 hover:to-teal-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 mt-4"
              >
                ✓ Confirmar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
