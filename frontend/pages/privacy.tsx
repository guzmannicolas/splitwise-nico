import React from 'react'
import Layout from '../components/Layout'
import Link from 'next/link'

export default function PrivacyPolicy() {
  return (
    <Layout fluid hideAuthLinks={false}>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 transition-colors duration-500 pt-32 pb-20 px-4">
        <div className="max-w-3xl mx-auto">
          <Link href="/" className="text-blue-600 dark:text-blue-400 hover:underline mb-8 inline-block font-semibold">
            ← Back to Home
          </Link>

          <h1 className="text-4xl lg:text-5xl font-extrabold text-slate-900 dark:text-white mb-8 tracking-tight">
            Privacy Policy
          </h1>

          <div className="prose prose-lg dark:prose-invert max-w-none space-y-6 text-slate-600 dark:text-slate-300">
            <section className="bg-white/50 dark:bg-slate-800/50 backdrop-blur-sm p-8 rounded-2xl border border-blue-100 dark:border-slate-700 shadow-sm">
              <h2 className="text-2xl font-bold text-blue-700 dark:text-blue-400 mb-4">Privacy by Design</h2>
              <p className="leading-relaxed">
                At <strong>Dividi2</strong>, we value your privacy as much as we value open source. Our philosophy is simple: we do not want your data — we just want you to be able to split your expenses without friction.
              </p>
            </section>

            <section className="space-y-4">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">1. Cookie Usage</h3>
              <p>
                We only use cookies to keep your session active and remember your display preferences (such as dark mode). We do not use cookies to identify you outside our platform.
              </p>
            </section>

            <section className="space-y-4">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">2. Tracking and Analytics</h3>
              <p>
                <strong>We do not track anyone.</strong> We do not use invasive analytics tools, tracking pixels, or third-party scripts that monitor your behavior.
              </p>
            </section>

            <section className="space-y-4">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">3. Third-Party Data</h3>
              <p>
                We do not share, sell, or transfer your data to third parties. All information you enter (groups, expenses, friends) is used exclusively to operate the application.
              </p>
            </section>

            <section className="bg-indigo-50/50 dark:bg-indigo-900/10 p-8 rounded-2xl border border-indigo-100 dark:border-indigo-900/30">
              <h3 className="text-xl font-bold text-indigo-700 dark:text-indigo-400 mb-2">Open Source Transparency</h3>
              <p>
                As an open-source project, you can audit exactly how we handle your data by reviewing our repository on GitHub. We believe transparency is the foundation of trust.
              </p>
            </section>
          </div>
        </div>
      </div>
    </Layout>
  )
}
