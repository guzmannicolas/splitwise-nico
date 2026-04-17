import React, { useState } from 'react'

const faqs = [
  {
    question: '¿Es realmente gratuito para siempre?',
    answer: 'Sí. Dividi2 es un proyecto personal de código abierto diseñado para ayudar a la comunidad. El objetivo es que siga siendo gratuito siempre que el volumen de usuarios no exceda las cuotas gratuitas del servidor. Si en el futuro es necesario, se buscarán formas de cubrir los costos de infraestructura sin fines de lucro.'
  },
  {
    question: '¿Mis datos están seguros?',
    answer: 'Totalmente. Utilizamos Supabase como motor de base de datos y autenticación, que ofrece estándares de seguridad de nivel industrial. Además, el proyecto es de código abierto, lo que permite auditar cómo manejamos la información.'
  },
  {
    question: '¿Qué diferencia hay con Splitwise?',
    answer: 'Splitwise es una excelente herramienta, pero recientemente ha limitado funciones en su versión gratuita. Dividi2 busca ofrecer una alternativa 100% gratuita, sin anuncios y con todas las funcionalidades core abiertas para todos.'
  },
  {
    question: '¿Cómo puedo instalar la App?',
    answer: 'Al entrar desde tu navegador móvil, pulsa en el botón de "Compartir" (en iOS) o en los tres puntos de menú (en Android) y selecciona "Añadir a la pantalla de inicio".'
  }
]

export default function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(0)

  return (
    <section className="py-24 bg-white dark:bg-slate-900 transition-colors duration-500">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-3">Dudas</h2>
          <p className="text-3xl lg:text-5xl font-extrabold text-slate-900 dark:text-white">Preguntas Frecuentes</p>
        </div>

        <div className="space-y-4">
          {faqs.map((faq, idx) => (
            <div 
              key={idx} 
              className={`rounded-2xl border transition-all duration-200 overflow-hidden ${
                openIdx === idx 
                  ? 'border-blue-200 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-900/10' 
                  : 'border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-800/20'
              }`}
            >
              <button 
                onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                className="w-full px-8 py-6 flex items-center justify-between text-left"
              >
                <span className="text-lg font-bold text-slate-900 dark:text-white">{faq.question}</span>
                <span className={`text-2xl transition-transform duration-300 ${openIdx === idx ? 'rotate-45 text-blue-500' : 'text-slate-400'}`}>
                  +
                </span>
              </button>
              <div 
                className={`px-8 overflow-hidden transition-all duration-300 ease-in-out ${
                  openIdx === idx ? 'max-h-96 pb-6 opacity-100' : 'max-h-0 opacity-0'
                }`}
              >
                <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                  {faq.answer}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
