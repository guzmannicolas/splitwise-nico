import React from 'react'
import Link from 'next/link'

export default function Hero() {
  return (
    <section className="relative w-full pt-10 pb-20 lg:pt-16 lg:pb-32 overflow-hidden bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-200 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 transition-colors duration-500">
      {/* Elementos decorativos de fondo */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
        <div className="absolute -top-24 -left-24 w-96 h-96 bg-blue-400/20 dark:bg-blue-600/10 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute top-1/2 -right-24 w-80 h-80 bg-indigo-400/20 dark:bg-indigo-600/10 rounded-full blur-3xl animate-pulse delay-700"></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div className="text-center lg:text-left">
            <h1 className="text-5xl lg:text-7xl font-extrabold text-blue-700 dark:text-blue-400 tracking-tight leading-tight mb-6">
              Organiza gastos,<br />
              <span className="text-slate-900 dark:text-white">disfruta el momento.</span>
            </h1>
            <p className="text-lg lg:text-xl text-slate-600 dark:text-slate-300 mb-10 max-w-2xl mx-auto lg:mx-0">
              Dividi2 es la plataforma gratuita y de código abierto para repartir gastos con amigos de forma simple, justa y sin complicaciones.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
              <Link 
                href="/auth/register" 
                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-indigo-500 text-white font-bold rounded-2xl shadow-lg hover:shadow-blue-500/30 hover:scale-105 transition-all duration-300 text-center text-lg"
              >
                Empezar ahora
              </Link>
              <Link 
                href="#" 
                target="_blank"
                className="px-8 py-4 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm text-slate-700 dark:text-slate-200 font-bold rounded-2xl border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 hover:scale-105 transition-all duration-300 text-center text-lg"
              >
                Ver en GitHub
              </Link>
            </div>
            <div className="mt-8 flex items-center justify-center lg:justify-start gap-4 text-sm text-slate-500 dark:text-slate-400">
              <span className="flex items-center gap-1">✅ 100% Gratis</span>
              <span className="flex items-center gap-1">🛡️ Privacidad total</span>
              <span className="flex items-center gap-1">🌍 Código Abierto</span>
            </div>
          </div>
          
          <div className="relative group lg:mt-0 mt-12">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-indigo-500 rounded-2xl blur opacity-25 group-hover:opacity-40 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl overflow-hidden border border-slate-200 dark:border-slate-800">
              {/* Mockup simplificado de la interfaz */}
              <div className="p-4 bg-slate-50 dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex gap-2">
                <div className="w-3 h-3 rounded-full bg-red-400"></div>
                <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                <div className="w-3 h-3 rounded-full bg-green-400"></div>
              </div>
              <div className="p-6">
                <div className="flex items-center justify-between mb-8">
                  <div className="space-y-2">
                    <div className="h-4 w-32 bg-slate-200 dark:bg-slate-700 rounded-full"></div>
                    <div className="h-4 w-24 bg-slate-100 dark:bg-slate-800 rounded-full"></div>
                  </div>
                  <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/40"></div>
                </div>
                <div className="grid grid-cols-2 gap-4 mb-8">
                  <div className="p-4 rounded-xl border border-green-100 dark:border-green-900/20 bg-green-50/50 dark:bg-green-900/10">
                    <div className="h-2 w-12 bg-green-200 dark:bg-green-800 rounded mb-2"></div>
                    <div className="h-6 w-16 bg-green-500 rounded"></div>
                  </div>
                  <div className="p-4 rounded-xl border border-red-100 dark:border-red-900/20 bg-red-50/50 dark:bg-red-900/10">
                    <div className="h-2 w-12 bg-red-200 dark:bg-red-800 rounded mb-2"></div>
                    <div className="h-6 w-16 bg-red-500 rounded"></div>
                  </div>
                </div>
                <div className="space-y-4">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-700"></div>
                        <div className="h-3 w-24 bg-slate-200 dark:bg-slate-700 rounded"></div>
                      </div>
                      <div className="h-3 w-12 bg-slate-200 dark:bg-slate-700 rounded"></div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
