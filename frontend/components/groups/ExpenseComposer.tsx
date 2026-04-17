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
}

/**
 * Encapsula el botón de agregar gasto y el formulario, manejando su estado interno.
 * Responsabilidad: controlar visibilidad del formulario y delegar creación.
 */
export default function ExpenseComposer({
  members,
  onCreate,
  creating,
  displayNameFor
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
          className="bg-gradient-to-r from-green-600 to-teal-500 text-white font-bold transition-all shadow-2xl hover:from-green-700 hover:to-teal-600 active:scale-95
                     fixed bottom-6 right-6 z-50 rounded-full px-6 py-4 flex items-center justify-center text-base
                     md:static md:w-full md:h-auto md:rounded-xl md:text-lg"
          aria-label="Agregar Gasto"
        >
          <span>+ Agregar Gasto</span>
        </button>
      )}

      {showForm && (
        <ExpenseForm
          members={members}
          onSubmit={handleSubmit}
          onCancel={() => setShowForm(false)}
          creating={creating}
          displayNameFor={displayNameFor}
        />
      )}
    </>
  )
}
