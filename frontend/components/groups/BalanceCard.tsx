import React, { useState, useEffect } from 'react'
import type { Balance } from '../../lib/services/types'

interface BalanceCardProps {
  balances: Balance[]
  onShowDetails?: () => void
}

export default function BalanceCard({ balances, onShowDetails }: BalanceCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDesktop, setIsDesktop] = useState(false)

  useEffect(() => {
    const checkIsDesktop = () => setIsDesktop(window.innerWidth >= 1024)
    checkIsDesktop()
    window.addEventListener('resize', checkIsDesktop)
    return () => window.removeEventListener('resize', checkIsDesktop)
  }, [])

  if (balances.length === 0) {
    return null
  }

  const renderContent = () => (
    <div className="space-y-4">
      <div className="space-y-2">
        {balances.map(b => (
          <div
            key={b.user_id}
            className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50/50 to-pink-50/50 dark:from-slate-800/50 dark:to-slate-800/50 rounded-xl border border-purple-100 dark:border-slate-700"
          >
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-lg bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center text-purple-600 dark:text-purple-400 font-bold">
                {b.name.charAt(0).toUpperCase()}
              </div>
              <span className="font-bold text-gray-800 dark:text-slate-100 text-sm">{b.name}</span>
            </div>
            <span
              className={`text-lg font-bold ${
                b.balance > 0.01
                  ? 'text-green-600 dark:text-green-500'
                  : b.balance < -0.01
                  ? 'text-red-600 dark:text-red-500'
                  : 'text-gray-500 dark:text-slate-500'
              }`}
            >
              {b.balance > 0.01
                ? `+$${b.balance.toFixed(2)}`
                : b.balance < -0.01
                ? `-$${Math.abs(b.balance).toFixed(2)}`
                : 'Salidado'}
            </span>
          </div>
        ))}
      </div>

      {onShowDetails && (
        <button
          onClick={() => {
            onShowDetails();
            if (!isDesktop) setIsModalOpen(false);
          }}
          className="w-full py-4 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-2xl transition-all shadow-lg shadow-purple-500/20 active:scale-95 flex items-center justify-center gap-2"
        >
          <span>📊</span> Ver detalles de deudas
        </button>
      )}

      <div className="p-4 bg-gray-50 dark:bg-slate-800/50 rounded-xl text-xs text-gray-500 dark:text-slate-400 border border-gray-100 dark:border-slate-800 leading-relaxed">
        <p className="flex items-center gap-2 mb-1">
          <span className="h-2 w-2 rounded-full bg-green-500"></span>
          <strong>Positivo:</strong> Le deben dinero
        </p>
        <p className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-red-500"></span>
          <strong>Negativo:</strong> Debe dinero
        </p>
      </div>
    </div>
  )

  // VISTA DESKTOP
  if (isDesktop) {
    return (
      <div className="bg-white dark:bg-slate-900 shadow-xl rounded-2xl p-6 border border-purple-100 dark:border-slate-800">
        <h2 className="text-2xl font-bold text-purple-700 dark:text-purple-400 mb-6 flex items-center gap-2">
          <span>⚖️ Balance</span>
        </h2>
        {renderContent()}
      </div>
    )
  }

  // VISTA MOBILE
  return (
    <>
      {/* Gatillo (Trigger Card) */}
      <button 
        onClick={() => setIsModalOpen(true)}
        className="w-full bg-white dark:bg-slate-900 shadow-xl rounded-2xl p-4 border border-purple-100 dark:border-slate-800 flex flex-col items-center justify-center gap-2 active:scale-95 transition-all text-purple-600 dark:text-purple-400"
      >
        <div className="p-3 bg-purple-50 dark:bg-slate-800 rounded-full group-hover:bg-purple-100 transition-colors">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818l.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <span className="font-bold text-sm">Balance</span>
        <span className="text-[10px] text-gray-400 dark:text-slate-500 uppercase">Saldos resumidos</span>
      </button>

      {/* Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4 animate-in fade-in duration-200">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-md" onClick={() => setIsModalOpen(false)}></div>
          
          <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-t-[2.5rem] sm:rounded-3xl shadow-2xl flex flex-col max-h-[90vh] border-t border-purple-100 dark:border-slate-800 overflow-hidden animate-in slide-in-from-bottom-full duration-300">
            {/* Header Modal */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 text-white flex justify-between items-center shrink-0">
              <h2 className="text-xl font-bold flex items-center gap-2">
                <span>⚖️</span> Balance del Grupo
              </h2>
              <button 
                onClick={() => setIsModalOpen(false)}
                className="h-10 w-10 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors text-2xl leading-none"
              >
                ×
              </button>
            </div>

            {/* Contenido Modal */}
            <div className="p-6 overflow-y-auto flex-1 pb-10">
              {renderContent()}
            </div>

            {/* Footer Modal */}
            <div className="p-4 border-t border-gray-100 dark:border-slate-800 bg-gray-50/50 dark:bg-slate-900/50 flex justify-center shrink-0">
              <button 
                onClick={() => setIsModalOpen(false)}
                className="w-full max-w-xs py-3 bg-gray-600 dark:bg-slate-700 text-white font-bold rounded-2xl hover:bg-gray-700 dark:hover:bg-slate-600 shadow-lg active:scale-95 transition-all"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
