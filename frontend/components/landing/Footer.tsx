import React from 'react'
import Link from 'next/link'

export default function Footer() {
  const currentYear = new Date().getFullYear()
  
  return (
    <footer className="bg-white dark:bg-slate-950 border-t border-slate-100 dark:border-slate-800 transition-colors duration-500 py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex flex-col items-center md:items-start gap-4">
            <Link href="/" className="flex items-center text-blue-700 dark:text-blue-400 font-bold text-2xl tracking-tight">
              💸 Dividi2
            </Link>
            <p className="text-slate-500 dark:text-slate-400 text-sm max-w-xs text-center md:text-left">
              Gestiona gastos compartidos de forma simple, justa y 100% gratuita. 
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-8 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <Link href="/auth/login" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Login</Link>
            <Link href="/auth/register" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">Register</Link>
            <Link href="#" target="_blank" className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors">GitHub</Link>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-slate-100 dark:border-slate-900 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-slate-400 dark:text-slate-500 text-xs">
            © {currentYear} Dividi2. Todos los derechos reservados.
          </p>
          <p className="text-slate-400 dark:text-slate-500 text-xs flex items-center gap-1">
            Hecho con <span className="text-red-500">❤️</span> por <span className="font-semibold text-slate-700 dark:text-slate-300">Nico</span> en Buenos Aires
          </p>
        </div>
      </div>
    </footer>
  )
}
