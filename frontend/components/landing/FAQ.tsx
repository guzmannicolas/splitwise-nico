import React, { useState } from 'react'

const faqs = [
  {
    question: 'Is it really free forever?',
    answer: 'Yes. Dividi2 is a personal open-source project designed to help the community. The goal is to keep it free as long as the user volume does not exceed the server\'s free tier. If it becomes necessary in the future, ways to cover infrastructure costs without profit will be sought.'
  },
  {
    question: 'Is my data safe?',
    answer: 'Absolutely. We use Supabase as our database and authentication engine, which offers industry-level security standards. In addition, the project is open source, allowing anyone to audit how we handle information.'
  },
  {
    question: 'How is it different from Splitwise?',
    answer: 'Splitwise is a great tool, but it has recently limited features in its free version. Dividi2 aims to offer a 100% free alternative, with no ads and all core features open to everyone.'
  },
  {
    question: 'How can I install the App?',
    answer: 'When you open it in your mobile browser, tap the "Share" button (on iOS) or the three-dot menu (on Android) and select "Add to Home Screen".'
  }
]

export default function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(0)

  return (
    <section className="py-24 bg-white dark:bg-slate-900 transition-colors duration-500">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h2 className="text-sm font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest mb-3">FAQ</h2>
          <p className="text-3xl lg:text-5xl font-extrabold text-slate-900 dark:text-white">Frequently Asked Questions</p>
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
