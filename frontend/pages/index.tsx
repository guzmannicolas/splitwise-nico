import { GetServerSideProps } from 'next'
import { redirectIfAuthed } from '../lib/authGuard'
import Layout from '../components/Layout'
import Hero from '../components/landing/Hero'
import Features from '../components/landing/Features'
import HowItWorks from '../components/landing/HowItWorks'
import FAQ from '../components/landing/FAQ'
import Contact from '../components/landing/Contact'
import Footer from '../components/landing/Footer'

export const getServerSideProps: GetServerSideProps = async (context) => {
  const redirect = await redirectIfAuthed(context)
  if (redirect) return redirect

  // Aquí podríamos hacer fetch de datos públicos en el futuro
  // como "Total de usuarios", "Gastos procesados", etc.
  return { props: {} }
}

export default function Home() {
  return (
    <Layout fluid hideAuthLinks={false}>
      <div className="flex flex-col w-full">
        <Hero />
        <Features />
        <HowItWorks />
        <FAQ />
        <Contact />
        <Footer />
      </div>
    </Layout>
  )
}
