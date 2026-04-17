import React from 'react'
import Link from 'next/link'
import { useRouter } from 'next/router'

export default function BottomNav() {
  const router = useRouter()
  const { pathname, query } = router
  const currentView = query.view || 'summary'

  const navItems = [
    {
      label: 'Inicio',
      icon: '🏠',
      href: '/dashboard?view=summary',
      active: pathname === '/dashboard' && currentView === 'summary'
    },
    {
      label: 'Grupos',
      icon: '👥',
      href: '/dashboard?view=groups',
      active: pathname === '/dashboard' && currentView === 'groups'
    },
    {
      label: 'Gastos',
      icon: '📝',
      href: '/dashboard?view=expenses',
      active: pathname === '/dashboard' && currentView === 'expenses'
    },
    {
      label: 'Perfil',
      icon: '👤',
      href: '/profile',
      active: pathname === '/profile'
    }
  ]

  return (
    <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white/80 dark:bg-slate-900/80 backdrop-blur-lg border-t border-blue-100 dark:border-slate-800 z-50 transition-colors">
      <div className="flex justify-around items-center h-16">
        {navItems.map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className={`flex flex-col items-center justify-center w-full h-full transition-all ${
              item.active 
                ? 'text-blue-600 dark:text-blue-400' 
                : 'text-gray-500 dark:text-slate-400'
            }`}
          >
            <span className="text-xl mb-0.5">{item.icon}</span>
            <span className="text-[10px] font-bold uppercase tracking-wider">{item.label}</span>
            {item.active && (
              <span className="absolute bottom-1 w-1 h-1 bg-blue-600 dark:bg-blue-400 rounded-full"></span>
            )}
          </Link>
        ))}
      </div>
    </nav>
  )
}
