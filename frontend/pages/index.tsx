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
      <main className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="max-w-lg w-full p-6 bg-white rounded shadow">
          <h1 className="text-2xl font-semibold mb-4">Splitwise Clone</h1>
          <p className="text-gray-600 mb-6">
            Divide gastos con amigos y mantén las cuentas claras
          </p>
          <div className="flex gap-3">
            <Link href="/auth/login" className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700">
              Login
            </Link>
            <Link href="/auth/register" className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">
              Register
            </Link>
          </div>
        </div>
      </main>
    </Layout>
  )
}
