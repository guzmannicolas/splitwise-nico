import React from 'react'

const steps = [
  {
    number: '01',
    title: 'Crea tu cuenta',
    description: 'Regístrate en segundos con tu email. Es totalmente gratis y seguro.',
    icon: '👤'
  },
  {
    number: '02',
    title: 'Arma tus grupos',
    description: 'Crea grupos para tus viajes, cenas o gastos compartidos en casa.',
    icon: '👥'
  },
  {
    number: '03',
    title: 'Divide y liquida',
    description: 'Añade gastos y deja que Dividi2 calcule quién debe a quién automáticamente.',
    icon: '💰'
  }
]

export default function HowItWorks() {
  return (
    <section className="py-24 bg-slate-50 dark:bg-slate-950 transition-colors duration-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-20">
          <h2 className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-3">Funcionamiento</h2>
          <p className="text-3xl lg:text-5xl font-extrabold text-slate-900 dark:text-white">Divide gastos en 3 pasos.</p>
        </div>

        <div className="relative">
          {/* Línea conectora decorativa (solo en desktop) */}
          <div className="hidden lg:block absolute top-1/2 left-0 w-full h-0.5 bg-slate-200 dark:bg-slate-800 -translate-y-1/2 z-0"></div>
          
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-12 relative z-10">
            {steps.map((step, idx) => (
              <div key={idx} className="flex flex-col items-center text-center">
                <div className="w-20 h-20 rounded-full bg-white dark:bg-slate-900 shadow-xl border-4 border-slate-50 dark:border-slate-950 flex items-center justify-center text-3xl mb-8 relative">
                  <span className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-blue-600 text-white text-xs font-bold flex items-center justify-center border-2 border-white dark:border-slate-900">
                    {step.number}
                  </span>
                  {step.icon}
                </div>
                <h3 className="text-2xl font-bold text-slate-900 dark:text-white mb-4">{step.title}</h3>
                <p className="text-slate-600 dark:text-slate-400 max-w-sm">
                  {step.description}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  )
}
