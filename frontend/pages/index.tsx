import { GetServerSideProps } from 'next'
import Link from 'next/link'
import { redirectIfAuthed } from '../lib/authGuard'
import Layout from '../components/Layout'

export const getServerSideProps: GetServerSideProps = async (context) => {
  const redirect = await redirectIfAuthed(context)
  if (redirect) return redirect

  return { props: {} }
}

export default function Home() {

  return (
    <Layout>
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-200 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 px-2 transition-colors duration-500">
        <div className="w-full max-w-xl bg-white/90 dark:bg-slate-900/90 shadow-2xl rounded-3xl p-10 border border-blue-100 dark:border-slate-800 backdrop-blur-md flex flex-col items-center transition-all">
          <h1 className="text-4xl font-extrabold text-blue-700 dark:text-blue-400 mb-2 text-center tracking-tight">Dividi2</h1>
          <p className="text-center text-gray-500 dark:text-slate-400 mb-8 text-lg">Divide gastos con amigos y mantén las cuentas claras</p>
          <div className="flex flex-col sm:flex-row gap-4 w-full justify-center">
            <Link href="/auth/login" className="w-full sm:w-auto py-3 px-6 bg-gradient-to-r from-blue-600 to-indigo-500 text-white font-bold rounded-lg shadow-md hover:from-blue-700 hover:to-indigo-600 transition-all duration-200 text-center">
              Login
            </Link>
            <Link href="/auth/register" className="w-full sm:w-auto py-3 px-6 bg-gradient-to-r from-blue-100 to-indigo-100 dark:from-slate-800 dark:to-slate-800 text-blue-700 dark:text-slate-100 font-bold rounded-lg shadow hover:from-blue-200 dark:hover:from-slate-700 border border-blue-200 dark:border-slate-700 transition-all duration-200 text-center">
              Register
            </Link>
          </div>
        </div>
      </main>
    </Layout>
  )
}
