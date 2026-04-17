import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'
import Link from 'next/link'
import Layout from '../../components/Layout'

import { redirectIfAuthed } from '../../lib/authGuard'
import { GetServerSideProps } from 'next'

export const getServerSideProps: GetServerSideProps = async (context) => {
  const result = await redirectIfAuthed(context)
  if (result) return result
  return { props: {} }
}

export default function Register() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-100 to-blue-200 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 px-2 transition-colors duration-500">
        <form onSubmit={handleRegister} className="w-full max-w-md p-8 bg-white/90 dark:bg-slate-900/90 rounded-2xl shadow-2xl border border-blue-100 dark:border-slate-800 backdrop-blur-md transition-all">
          <h2 className="text-3xl font-extrabold text-blue-700 dark:text-blue-400 mb-6 text-center">Registrarse</h2>
          {message && (
            <p className={`${
              message.includes('Error') || message.includes('error') 
                ? 'text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/10 border-red-100 dark:border-red-900/20' 
                : 'text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/10 border-green-100 dark:border-green-900/20'
            } p-3 rounded-lg mb-4 text-sm border`}>
              {message}
            </p>
          )}
          <input 
            className="w-full mb-4 p-3 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 transition-colors" 
            placeholder="Email" 
            value={email} 
            onChange={e => setEmail(e.target.value)} 
          />
          <div className="relative mb-4">
            <input 
              className="w-full p-3 pr-12 border border-gray-200 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-300 dark:focus:ring-blue-500 bg-white dark:bg-slate-800 text-gray-900 dark:text-slate-100 transition-colors" 
              type={showPassword ? "text" : "password"} 
              placeholder="Contraseña" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-slate-400 dark:hover:text-slate-200 focus:outline-none"
              aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
            >
              {showPassword ? (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                </svg>
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
              )}
            </button>
          </div>
          <button 
            className="w-full py-3 bg-gradient-to-r from-green-600 to-teal-500 text-white font-bold rounded-lg shadow-md hover:from-green-700 hover:to-teal-600 transition-all duration-200" 
            type="submit"
          >
            Registrarse
          </button>
          <div className="mt-6 text-center">
            <Link href="/auth/login" className="text-sm text-gray-600 dark:text-slate-400 hover:text-gray-800 dark:hover:text-slate-200">
              ¿Ya tienes cuenta? <span className="font-semibold text-blue-600 dark:text-blue-400">Inicia sesión</span>
            </Link>
          </div>
        </form>
      </div>
    </Layout>
  )
}
