import '../styles/globals.css'
import type { AppProps } from 'next/app'
import Head from 'next/head'
import Script from 'next/script'
import { useEffect } from 'react'

export default function App({ Component, pageProps }: AppProps) {
  // Registrar Service Worker para PWA
  useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then((registration) => {
          console.log('Service Worker registrado con éxito:', registration.scope);
        })
        .catch((error) => {
          console.error('Error al registrar Service Worker:', error);
        });
    }
  }, []);

  return (
    <>
      <Head>
        <title>Splitwise Nico - Divide gastos con amigos y mantén las cuentas claras</title>
        <meta name="description" content="Gestiona gastos compartidos de forma simple y efectiva" />
        
        {/* PWA Meta Tags */}
        <meta name="application-name" content="Splitwise Nico" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="Splitwise Nico" />
        <meta name="format-detection" content="telephone=no" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="theme-color" content="#4F46E5" />
        
        {/* Viewport */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5, viewport-fit=cover" />
        
        {/* Icons */}
        <link rel="icon" href="/favicon.ico" />
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon-192x192.png" />
        
        {/* Open Graph */}
        <meta property="og:type" content="website" />
        <meta property="og:title" content="Splitwise Nico" />
        <meta property="og:description" content="Gestiona gastos compartidos de forma simple y efectiva" />
        <meta property="og:site_name" content="Splitwise Nico" />
      </Head>

      <Script
        id="theme-init"
        strategy="beforeInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            (function() {
              try {
                const savedTheme = localStorage.getItem('theme');
                const theme = savedTheme || 'dark';
                if (theme === 'dark') {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              } catch (e) {}
            })()
          `,
        }}
      />
      <Component {...pageProps} />
    </>
  )
}
