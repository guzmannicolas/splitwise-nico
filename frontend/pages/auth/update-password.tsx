import { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/router'
import Layout from '../../components/Layout'

export default function UpdatePassword() {
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      })

      if (error) throw error
      
      setMessage('Contraseña actualizada correctamente')
      // Redirigir al login después de 2 segundos
      setTimeout(() => router.push('/auth/login'), 2000)
    } catch (error) {
      setMessage('Error: ' + (error instanceof Error ? error.message : String(error)))
    } finally {
      setLoading(false)
    }
  }

  // Verificar que el usuario tenga un token válido
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        router.push('/auth/login')
      }
    }
    checkSession()
  }, [router])

  return (
    <Layout hideAuthLinks>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-200 py-12 px-2">
        <div className="max-w-md w-full bg-white/90 rounded-2xl shadow-2xl border border-blue-100 backdrop-blur-md p-8">
          <div>
            <h2 className="text-3xl font-extrabold text-blue-700 text-center mb-2">
              Actualizar contraseña
            </h2>
            <p className="text-center text-gray-500 mb-6">Ingresa tu nueva contraseña</p>
          </div>
          <form className="space-y-6" onSubmit={handleUpdatePassword}>
            <div>
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300"
                placeholder="Nueva contraseña"
                minLength={6}
              />
            </div>

            {message && (
              <div className={`text-sm p-3 rounded-lg ${message.includes('Error') ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50'}`}>
                {message}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-500 text-white font-bold rounded-lg shadow-md hover:from-blue-700 hover:to-indigo-600 transition-all duration-200 disabled:opacity-50"
              >
                {loading ? 'Actualizando...' : 'Actualizar contraseña'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  )
}