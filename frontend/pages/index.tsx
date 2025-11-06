
import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { supabase } from '../lib/supabaseClient'
import Layout from '../components/Layout'

export default function Home() {
  const router = useRouter()

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session) {
        router.push('/dashboard')
      }
    }
    checkSession()
  }, [router])

  return (
    <Layout>
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-200 px-2">
        <div className="w-full max-w-xl bg-white/90 shadow-2xl rounded-3xl p-10 border border-blue-100 backdrop-blur-md flex flex-col items-center">
          <h1 className="text-4xl font-extrabold text-blue-700 mb-2 text-center tracking-tight">Dividi2</h1>
          <p className="text-center text-gray-500 mb-8 text-lg">Divide gastos con amigos y mantén las cuentas claras</p>
          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
            <Link href="/auth/login" className="w-full sm:w-auto py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-500 text-white font-bold rounded-lg shadow-md hover:from-blue-700 hover:to-indigo-600 transition-all duration-200 text-center">
              Login
            </Link>
            <Link href="/auth/register" className="w-full sm:w-auto py-3 px-6 bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-700 font-bold rounded-lg shadow hover:from-blue-200 hover:to-indigo-200 border border-blue-200 transition-all duration-200 text-center">
              Register
            </Link>
          </div>
        </div>
      </main>
    </Layout>
  )
}
