import { useState, useEffect, useRef } from 'react'
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
    fullBeneficiaryId?: string,
    createdAt?: string
  ) => Promise<void>
  onCancel: () => void
  creating: boolean
  displayNameFor: (userId: string) => string
  currentUserId: string
  initialData?: {
    description: string
    amount: string
    paidBy: string
    createdAt?: string
  }
  isEditMode?: boolean
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
  currentUserId,
  initialData,
  isEditMode = false
}: ExpenseFormProps) {
  const [description, setDescription] = useState(initialData?.description || '')
  const [amount, setAmount] = useState(initialData?.amount || '')
  const [paidBy, setPaidBy] = useState(initialData?.paidBy || currentUserId)
  const [splitType, setSplitType] = useState<SplitType>('equal')
  const [customSplits, setCustomSplits] = useState<Record<string, string>>({})
  const [fullBeneficiaryId, setFullBeneficiaryId] = useState('')
  const [selectedDate, setSelectedDate] = useState<string>(
    initialData?.createdAt 
      ? new Date(initialData.createdAt).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]
  )
  const [showDatePicker, setShowDatePicker] = useState(false)
  
  // Nuevos estados para el diseño mejorado
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(
    members.map(m => m.user_id)
  )
  const [showPayerModal, setShowPayerModal] = useState(false)
  const [payerMode, setPayerMode] = useState<PayerMode>('single')
  const [multiplePayerAmounts, setMultiplePayerAmounts] = useState<Record<string, string>>({})
  const [showParticipantSelector, setShowParticipantSelector] = useState(false)
  const [showDivisionModal, setShowDivisionModal] = useState(false)
  // Se eliminó comportamiento expandible por requerimiento
  const participantSelectorRef = useRef<HTMLDivElement>(null)
  const datePickerRef = useRef<HTMLDivElement>(null)

  // Cerrar selector de participantes al hacer click afuera
  useEffect(() => {
    if (!showParticipantSelector) return
    const handleClickOutside = (e: MouseEvent) => {
      if (participantSelectorRef.current && !participantSelectorRef.current.contains(e.target as Node)) {
        setShowParticipantSelector(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showParticipantSelector])

  // Cerrar date picker al hacer click afuera
  useEffect(() => {
    if (!showDatePicker) return
    const handleClickOutside = (e: MouseEvent) => {
      if (datePickerRef.current && !datePickerRef.current.contains(e.target as Node)) {
        setShowDatePicker(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [showDatePicker])

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

    // Convertir la fecha seleccionada a ISO string con hora actual
    const selectedDateTime = new Date(selectedDate + 'T' + new Date().toTimeString().split(' ')[0])

    await onSubmit(description, amountNum, paidBy, splitType, customSplits, fullBeneficiaryId || undefined, selectedDateTime.toISOString())

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
      <form onSubmit={handleSubmit} className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl shadow-lg max-w-lg mx-auto animate-slideUp space-y-6">
        {/* Línea 1: Título */}
        <div className="flex items-center justify-between border-b pb-3">
          <h2 className="text-lg sm:text-xl font-bold text-blue-700">
            {isEditMode ? 'Editar gasto' : 'Añadir un gasto'}
          </h2>
          <button
            type="button"
            onClick={onCancel}
            className="text-gray-500 hover:text-gray-700 text-4xl leading-none transition-colors w-10 h-10 flex items-center justify-center"
            disabled={creating}
          >
            ×
          </button>
        </div>

        {/* Línea 2: Participantes */}
        <div className="space-y-2" ref={participantSelectorRef}>
          <span className="text-sm font-medium text-gray-600">Con tú y</span>
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowParticipantSelector(!showParticipantSelector)}
              className="w-full flex items-center gap-2 p-3 border border-gray-300 rounded-lg hover:border-blue-500 transition-all duration-200 bg-white hover:shadow-md text-sm"
              disabled={creating}
            >
              <span className="text-xl">👥</span>
              <span className="text-gray-700 flex-1 text-left">
                {selectedParticipants.length === members.length
                  ? 'Todos'
                  : `${selectedParticipants.length} persona${selectedParticipants.length !== 1 ? 's' : ''}`}
              </span>
              <span className="text-gray-400">×</span>
            </button>
            {showParticipantSelector && (
              <div className="absolute z-10 mt-2 w-full bg-white border border-gray-200 rounded-lg shadow-xl max-h-60 overflow-y-auto animate-slideUp">
                {members.map(member => (
                  <label
                    key={member.user_id}
                    className="flex items-center gap-3 p-3 hover:bg-blue-50 cursor-pointer transition-colors duration-150 text-sm"
                  >
                    <input
                      type="checkbox"
                      checked={selectedParticipants.includes(member.user_id)}
                      onChange={() => toggleParticipant(member.user_id)}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-gray-700">{displayNameFor(member.user_id)}</span>
                  </label>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Línea 3: Descripción */}
        <div>
          <span className="text-sm font-medium text-gray-600">Descripción</span>
          <input
            type="text"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="mt-2 w-full text-gray-700 text-sm sm:text-base border-0 border-b border-gray-200 focus:border-blue-500 focus:outline-none py-2 transition-colors"
            placeholder="Introduce una descripción"
            required
            disabled={creating}
          />
        </div>

        {/* Línea 4: Monto */}
        <div>
          <span className="text-sm font-medium text-gray-600">Monto</span>
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

        {/* Línea 5: Pagado por */}
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-gray-600">Pagado por</span>
          <button
            type="button"
            onClick={() => setShowPayerModal(true)}
            className="inline-flex items-center justify-center gap-2 w-56 h-12 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-medium shadow-sm hover:shadow-md hover:from-blue-600 hover:to-blue-700 transition-all duration-200"
            disabled={creating}
          >
            <span className="text-lg">👤</span>
            <span>{getPayerDisplayText()}</span>
          </button>
        </div>

        {/* Línea 6: División */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Dividido</span>
            <button
              type="button"
              className="inline-flex items-center justify-center gap-2 w-56 h-12 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-medium shadow-sm hover:shadow-md hover:from-blue-600 hover:to-blue-700 transition-all duration-200"
              onClick={() => setShowDivisionModal(true)}
              disabled={creating}
            >
              <span className="text-base">⚡</span>
              <span className="text-sm">
                {splitType === 'equal' ? 'a partes iguales' : splitType === 'custom' ? 'por monto' : splitType === 'percent' ? 'por porcentaje' : 'cada uno paga su parte'}
              </span>
            </button>
          </div>
          {selectedParticipants.length > 0 && amount && splitType === 'equal' && (
            <div className="text-xs text-blue-600 font-medium">
              (${calculateEqualSplitAmount().toFixed(2)}/persona)
            </div>
          )}
        </div>

        {/* Línea 7: Fecha */}
        <div className="relative" ref={datePickerRef}>
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-600">Fecha</span>
            <button
              type="button"
              onClick={() => setShowDatePicker(!showDatePicker)}
              className="inline-flex items-center justify-center gap-2 w-56 h-12 rounded-full bg-gradient-to-r from-blue-500 to-blue-600 text-white text-sm font-medium shadow-sm hover:shadow-md hover:from-blue-600 hover:to-blue-700 transition-all duration-200"
              disabled={creating}
            >
              <span>📅 {new Date(selectedDate).toLocaleDateString('es-ES', { day: 'numeric', month: 'short' })}</span>
            </button>
          </div>
          {showDatePicker && (
            <div className="absolute right-0 top-full mt-2 bg-white rounded-lg shadow-xl border border-gray-200 p-4 z-20 animate-slideUp">
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => {
                  setSelectedDate(e.target.value)
                  setShowDatePicker(false)
                }}
                className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
              />
            </div>
          )}
        </div>

        {/* Línea 8: Acciones */}
        <div className="flex flex-col sm:flex-row gap-3 pt-2">
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
            className="w-full sm:w-auto flex-1 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white font-semibold rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md hover:shadow-lg transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
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
