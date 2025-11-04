import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Link from 'next/link'
import Layout from '../../components/Layout'

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    try {
      const { data, error } = await supabase.auth.signUp({ 
        email, 
        password,
        options: {
          emailRedirectTo: 'https://onkzxqtejpyauibwqhop.supabase.co/auth/v1/callback'
        }
      })
      
      console.log('Response:', { data, error })
      
      if (error) {
        console.error('Supabase error:', error)
        setMessage(error.message)
      } else {
        setMessage('Revisa tu correo para confirmar la cuenta')
      }
    } catch (err) {
      console.error('Caught error:', err)
      setMessage('Error inesperado: ' + (err instanceof Error ? err.message : String(err)))
    }
  }

  return (
    <Layout hideAuthLinks>
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-100 to-blue-200 px-2">
        <form onSubmit={handleRegister} className="w-full max-w-md p-8 bg-white/90 rounded-2xl shadow-2xl border border-blue-100 backdrop-blur-md">
          <h2 className="text-3xl font-extrabold text-blue-700 mb-6 text-center">Registrarse</h2>
          {message && <p className={`${message.includes('Error') || message.includes('error') ? 'text-red-600 bg-red-50' : 'text-green-600 bg-green-50'} p-3 rounded-lg mb-4 text-sm`}>{message}</p>}
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
            className="w-full py-3 bg-gradient-to-r from-green-600 to-teal-500 text-white font-bold rounded-lg shadow-md hover:from-green-700 hover:to-teal-600 transition-all duration-200" 
            type="submit"
          >
            Registrarse
          </button>
          <div className="mt-6 text-center">
            <Link href="/auth/login" className="text-sm text-gray-600 hover:text-gray-800">
              ¿Ya tienes cuenta? <span className="font-semibold text-blue-600">Inicia sesión</span>
            </Link>
          </div>
        </form>
      </div>
    </Layout>
  )
}
