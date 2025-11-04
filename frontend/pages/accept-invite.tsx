import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabaseClient'

export default function AcceptInvite() {
  const router = useRouter()
  const { token } = router.query
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [groupId, setGroupId] = useState<string | null>(null)
  const [needsAuth, setNeedsAuth] = useState(false)

  useEffect(() => {
    if (!token) return

    async function processInvitation() {
      try {
        // Verificar si hay sesión
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          setNeedsAuth(true)
          setLoading(false)
          // Guardar token en localStorage para usar después del login
          localStorage.setItem('pending_invitation_token', token as string)
          return
        }

        // Llamar a la función que acepta la invitación
        const { data, error: rpcError } = await supabase
          .rpc('accept_invitation', { invitation_token: token })

        if (rpcError) {
          setError(rpcError.message)
          setLoading(false)
          return
        }

        const result = data as { success: boolean; message: string; group_id?: string }

        if (!result.success) {
          setError(result.message)
          setLoading(false)
          return
        }

        // Éxito
        setSuccess(true)
        setGroupId(result.group_id || null)
        setLoading(false)

        // Redirigir al grupo después de 2 segundos
        if (result.group_id) {
          setTimeout(() => {
            router.push(`/groups/${result.group_id}`)
          }, 2000)
        }
      } catch (err: any) {
        setError(err.message || 'Error al procesar la invitación')
        setLoading(false)
      }
    }

    processInvitation()
  }, [token, router])

  // Manejar aceptación después del login
  useEffect(() => {
    const pendingToken = localStorage.getItem('pending_invitation_token')
    if (pendingToken && !token) {
      localStorage.removeItem('pending_invitation_token')
      router.push(`/accept-invite?token=${pendingToken}`)
    }
  }, [token, router])

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Procesando invitación...</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (needsAuth) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">📧</div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Invitación Recibida
              </h1>
              <p className="text-gray-600">
                Para aceptar esta invitación, primero debes iniciar sesión o crear una cuenta.
              </p>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => router.push('/auth/login')}
                className="w-full bg-blue-600 text-white rounded-xl py-3 font-semibold hover:bg-blue-700 transition"
              >
                Iniciar Sesión
              </button>
              <button
                onClick={() => router.push('/auth/register')}
                className="w-full bg-white text-blue-600 border-2 border-blue-600 rounded-xl py-3 font-semibold hover:bg-blue-50 transition"
              >
                Crear Cuenta
              </button>
            </div>

            <p className="text-sm text-gray-500 text-center mt-4">
              Tu invitación se guardará y se procesará automáticamente después de iniciar sesión.
            </p>
          </div>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-100">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="text-6xl mb-4">❌</div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Error
              </h1>
              <p className="text-red-600 mb-6">{error}</p>
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-blue-600 text-white rounded-xl px-6 py-3 font-semibold hover:bg-blue-700 transition"
              >
                Ir al Dashboard
              </button>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  if (success) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="text-6xl mb-4">✅</div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                ¡Te uniste al grupo!
              </h1>
              <p className="text-gray-600 mb-6">
                Te redirigiremos al grupo en unos segundos...
              </p>
              {groupId && (
                <button
                  onClick={() => router.push(`/groups/${groupId}`)}
                  className="bg-blue-600 text-white rounded-xl px-6 py-3 font-semibold hover:bg-blue-700 transition"
                >
                  Ir al Grupo Ahora
                </button>
              )}
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  return null
}
