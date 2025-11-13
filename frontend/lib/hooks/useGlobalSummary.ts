import { useEffect, useState } from 'react'
import { SummaryService, type GlobalSummary } from '../services/SummaryService'

export function useGlobalSummary(userId: string | null) {
  const [summary, setSummary] = useState<GlobalSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let active = true
    async function load() {
      if (!userId) {
        setSummary(null)
        return
      }
      setLoading(true)
      setError(null)
      const { data, error } = await SummaryService.getUserSummary(userId)
      if (!active) return
      if (error) setError(error.message || 'Error al cargar resumen')
      setSummary(data)
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [userId])

  return { summary, loading, error }
}
