import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import { useRouter } from 'next/router'
import Link from 'next/link'
import Layout from '../../components/Layout'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError(error.message)
    else router.push('/dashboard')
  }

  return (
    <Layout hideAuthLinks>
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-200 px-2">
      <form onSubmit={handleLogin} className="w-full max-w-md p-8 bg-white/90 rounded-2xl shadow-2xl border border-blue-100 backdrop-blur-md">
        <h2 className="text-3xl font-extrabold text-blue-700 mb-6 text-center">Iniciar Sesión</h2>
        {error && <p className="text-red-600 bg-red-50 p-3 rounded-lg mb-4 text-sm">{error}</p>}
        <input 
          className="w-full mb-4 p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300" 
          placeholder="Email" 
          value={email} 
          onChange={e => setEmail(e.target.value)} 
        />
        <input 
          className="w-full mb-4 p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300" 
          type="password" 
          placeholder="Contraseña" 
          value={password} 
          onChange={e => setPassword(e.target.value)} 
        />
        <button 
          className="w-full py-3 bg-gradient-to-r from-blue-600 to-indigo-500 text-white font-bold rounded-lg shadow-md hover:from-blue-700 hover:to-indigo-600 transition-all duration-200" 
          type="submit"
        >
          Iniciar Sesión
        </button>
        <div className="mt-6 text-center space-y-2">
          <Link href="/auth/forgot-password" className="block text-sm text-blue-600 hover:text-blue-800 font-semibold">
            ¿Olvidaste tu contraseña?
          </Link>
          <Link href="/auth/register" className="block text-sm text-gray-600 hover:text-gray-800">
            ¿No tienes cuenta? <span className="font-semibold text-blue-600">Regístrate</span>
          </Link>
        </div>
      </form>
    </div>
    </Layout>
  )
}
