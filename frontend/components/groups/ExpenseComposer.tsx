import { useState } from 'react'
import ExpenseForm from './ExpenseForm'
import type { Member, SplitType } from '../../lib/services/types'

interface ExpenseComposerProps {
  members: Member[]
  onCreate: (
    description: string,
    amount: number,
    paidBy: string,
    splitType: SplitType,
    customSplits?: Record<string, string>,
    fullBeneficiaryId?: string
  ) => Promise<void>
  creating: boolean
  displayNameFor: (userId: string) => string
  currentUserId: string
}

/**
 * Encapsula el botón de agregar gasto y el formulario, manejando su estado interno.
 * Responsabilidad: controlar visibilidad del formulario y delegar creación.
 */
export default function ExpenseComposer({
  members,
  onCreate,
  creating,
  displayNameFor,
  currentUserId
}: ExpenseComposerProps) {
  const [showForm, setShowForm] = useState(false)

  const handleSubmit = async (
    description: string,
    amount: number,
    paidBy: string,
    splitType: SplitType,
    customSplits?: Record<string, string>,
    fullBeneficiaryId?: string
  ) => {
    await onCreate(description, amount, paidBy, splitType, customSplits, fullBeneficiaryId)
    setShowForm(false) // ocultar formulario después de crear
  }

  return (
    <>
      {!showForm && (
        <button
          onClick={() => setShowForm(true)}
          className="w-full py-4 bg-gradient-to-r from-green-600 to-teal-500 text-white font-bold text-lg rounded-xl hover:from-green-700 hover:to-teal-600 transition-all shadow-lg"
        >
          + Agregar Gasto
        </button>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 animate-fadeIn">
          <div className="max-w-2xl w-full">
            <ExpenseForm
              members={members}
              onSubmit={handleSubmit}
              onCancel={() => setShowForm(false)}
              creating={creating}
              displayNameFor={displayNameFor}
              currentUserId={currentUserId}
            />
          </div>
        </div>
      )}
    </>
  )
}
