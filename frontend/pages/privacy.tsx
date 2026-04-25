import React from 'react'
import Layout from '../components/Layout'
import Link from 'next/link'

export default function PrivacyPolicy() {
  return (
    <Layout fluid hideAuthLinks={false}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 transition-colors duration-500 pt-32 pb-20 px-4">
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline mb-8 inline-block font-semibold">
            ← Volver al inicio
          </Link>
          
          <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white mb-8 tracking-tight">
            Política de Privacidad
          </h1>
          
          <div className="prose prose-lg dark:prose-invert max-w-none space-y-6 text-slate-600 dark:text-slate-300">
            <section className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm p-8 rounded-2xl border border-blue-100 dark:border-slate-700 shadow-sm">
              <h2 className="text-2xl font-bold text-blue-700 dark:text-blue-400 mb-4">Privacidad por diseño</h2>
              <p className="leading-relaxed">
                En <strong>Dividi2</strong>, valoramos tu privacidad tanto como valoramos el código abierto. Nuestra filosofía es simple: no queremos tus datos, solo queremos que puedas dividir tus gastos sin fricciones.
              </p>
            </section>

            <section className="space-y-4">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">1. Uso de Cookies</h3>
              <p>
                Solo usamos cookies para mantener tu sesión activa y recordar tus preferencias de diseño (como el modo oscuro). No usamos cookies para identificarte fuera de nuestra plataforma.
              </p>
            </section>

            <section className="space-y-4">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">2. Rastreo y Analytics</h3>
              <p>
                <strong>No rastreamos a nadie.</strong> No utilizamos herramientas de analítica invasivas, ni píxeles de seguimiento, ni scripts de terceros que monitoreen tu comportamiento.
              </p>
            </section>

            <section className="space-y-4">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">3. Datos de Terceros</h3>
              <p>
                No compartimos, vendemos ni cedemos tus datos a terceros. Toda la información que ingresas (grupos, gastos, amigos) se utiliza exclusivamente para el funcionamiento de la aplicación.
              </p>
            </section>

            <section className="bg-indigo-50/50 dark:bg-indigo-900/10 p-8 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
              <h3 className="text-xl font-bold text-indigo-700 dark:text-indigo-400 mb-2">Transparencia Open Source</h3>
              <p>
                Al ser un proyecto de código abierto, puedes auditar exactamente cómo manejamos tus datos revisando nuestro repositorio en GitHub. Creemos que la transparencia es la base de la confianza.
              </p>
            </section>
          </div>
        </div>
      </div>
    </Layout>
  )
}
