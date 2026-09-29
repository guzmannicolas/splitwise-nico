import { useRef, useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Layout from '../../components/Layout'
import { Turnstile, type TurnstileInstance } from '@marsidev/react-turnstile'
import { verifyTurnstile } from '../../lib/verifyTurnstile'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null)
  const turnstileRef = useRef<TurnstileInstance>(null)

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (!turnstileToken) {
      setMessage('Completá la verificación de seguridad')
      return
    }

    setLoading(true)
    try {
      const valid = await verifyTurnstile(turnstileToken)
      if (!valid) {
        setMessage('Error: Verificación de seguridad fallida, intentá de nuevo')
        turnstileRef.current?.reset()
        setTurnstileToken(null)
        return
      }

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/update-password`,
      })

      if (error) throw error
      setMessage('Revisa tu email para restablecer tu contraseña')
    } catch (error) {
      setMessage('Error: ' + (error instanceof Error ? error.message : String(error)))
      turnstileRef.current?.reset()
      setTurnstileToken(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Layout hideAuthLinks>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-200 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 py-12 px-2 transition-colors duration-500">
        <div className="max-w-md w-full bg-white/90 dark:bg-slate-900/90 rounded-2xl shadow-2xl border border-blue-100 dark:border-slate-800 backdrop-blur-md p-8 transition-all">
          <div>
            <h2 className="text-3xl font-extrabold text-blue-700 dark:text-blue-400 text-center mb-2">
              Recuperar contraseña
            </h2>
            <p className="text-center text-gray-500 dark:text-slate-400 mb-6">Ingresa tu email para recibir el enlace de recuperación</p>
          </div>
          <form className="space-y-6" onSubmit={handleResetPassword}>
            <div>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 transition-colors"
                placeholder="Email"
              />
            </div>

            <div className="flex justify-center">
              <Turnstile
                ref={turnstileRef}
                siteKey={process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY!}
                onSuccess={setTurnstileToken}
                onExpire={() => setTurnstileToken(null)}
                onError={() => setTurnstileToken(null)}
              />
            </div>

            {message && (
              <div className={`text-sm p-3 rounded-lg border ${
                message.includes('Error') || message.includes('fallida') || message.includes('Completá')
                  ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20'
                  : 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/20'
              }`}>
                {message}
              </div>
            )}

            <div>
              <button
                type="submit"
                disabled={loading || !turnstileToken}
                className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-500 text-white font-bold rounded-lg shadow-md hover:from-blue-700 hover:to-indigo-600 transition-all duration-200 disabled:opacity-50"
              >
                {loading ? 'Enviando...' : 'Enviar email de recuperación'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </Layout>
  )
}
