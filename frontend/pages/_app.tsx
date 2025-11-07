import '../styles/globals.css'
import type { AppProps } from 'next/app'
import Head from 'next/head'

export default function App({ Component, pageProps }: AppProps) {
  return (
    <>
      <Head>
        <title>Dividi2 - Divide gastos con amigos y mantén las cuentas claras</title>
        <meta name="description" content="Dividir gastos entre grupos de personas" />
        <link rel="icon" href="/favicon.ico" />
      </Head>
      <Component {...pageProps} />
    </>
  )
}
