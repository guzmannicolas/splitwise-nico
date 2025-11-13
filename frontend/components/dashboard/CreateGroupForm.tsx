import React, { useState } from 'react'

type Props = {
  onCreate: (name: string, description: string) => Promise<void>
}

export default function CreateGroupForm({ onCreate }: Props) {
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) return
    setSubmitting(true)
    try {
      await onCreate(name, description)
      setName('')
      setDescription('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="bg-gradient-to-br from-white to-indigo-50 shadow-xl rounded-2xl p-6 border border-blue-100">
      <h2 className="text-2xl font-bold text-blue-700 mb-4">Crear nuevo grupo</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Nombre del grupo</label>
          <input
            type="text"
            placeholder="Ej: Viaje a Brasil 2025"
            value={name}
            onChange={e => setName(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
            required
            disabled={submitting}
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-2">Descripción (opcional)</label>
          <textarea
            placeholder="Describe el propósito del grupo"
            value={description}
            onChange={e => setDescription(e.target.value)}
            className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 h-24 resize-none"
            disabled={submitting}
          />
        </div>
        <button
          type="submit"
          className="w-full bg-gradient-to-r from-blue-600 to-indigo-500 text-white font-bold p-3 rounded-lg shadow-md hover:from-blue-700 hover:to-indigo-600 transition-all duration-200 disabled:opacity-50"
          disabled={submitting}
        >
          {submitting ? 'Creando...' : 'Crear Grupo'}
        </button>
      </form>
    </div>
  )
}
