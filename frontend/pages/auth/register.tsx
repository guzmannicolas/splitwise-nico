import { useState } from 'react'
import { supabase } from '../../lib/supabaseClient'

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
    <div className="min-h-screen flex items-center justify-center">
      <form onSubmit={handleRegister} className="w-full max-w-md p-6 bg-white rounded shadow">
        <h2 className="text-xl mb-4">Register</h2>
        {message && <p className="text-green-600">{message}</p>}
        <input className="w-full mb-2 p-2 border" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} />
        <input className="w-full mb-2 p-2 border" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} />
        <button className="w-full py-2 bg-green-600 text-white rounded" type="submit">Register</button>
      </form>
    </div>
  )
}
