import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabaseClient'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import { usePushNotifications } from '../lib/hooks/usePushNotifications'

export default function Profile() {
  const router = useRouter()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [email, setEmail] = useState('')
  const [fullName, setFullName] = useState('')
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    loadProfile()
  }, [])

  async function loadProfile() {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        router.push('/auth/login')
        return
      }

      setUserId(user.id)
      setEmail(user.email || '')

      const { data: profile } = await supabase
        .from('profiles')
        .select('full_name')
        .eq('id', user.id)
        .single()

      if (profile) {
        setFullName(profile.full_name || '')
      }
    } catch (error) {
      console.error('Error loading profile:', error)
    } finally {
      setLoading(false)
    }
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault()
    if (!userId) return

    try {
      setSaving(true)
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: userId,
          full_name: fullName
        })

      if (error) throw error

      alert('Perfil actualizado correctamente')
    } catch (error: any) {
      console.error('Error saving profile:', error)
      let msg = 'Error desconocido';
      if (error && typeof error === 'object') {
        if (error.message) msg = error.message;
        else if (error.details) msg = error.details;
        else msg = JSON.stringify(error);
      } else {
        msg = String(error);
      }
      alert('Error al guardar: ' + msg)
    } finally {
      setSaving(false)
    }
  }

  const { subscribe, unsubscribe } = usePushNotifications()
  const [pushLoading, setPushLoading] = useState(false)
  const [pushEnabled, setPushEnabled] = useState(false)

  const handleEnablePush = async () => {
    try {
      setPushLoading(true)
      await subscribe()
      setPushEnabled(true)
      alert('Notificaciones activadas')
    } catch (err: any) {
      console.error('Error subscribe', err)
      alert('No se pudo activar notificaciones: ' + (err?.message || String(err)))
    } finally {
      setPushLoading(false)
    }
  }

  const handleDisablePush = async () => {
    try {
      setPushLoading(true)
      await unsubscribe()
      setPushEnabled(false)
      alert('Notificaciones desactivadas')
    } catch (err: any) {
      console.error('Error unsubscribe', err)
      alert('No se pudo desactivar notificaciones: ' + (err?.message || String(err)))
    } finally {
      setPushLoading(false)
    }
  }

  if (loading) {
    return (
      <Layout>
        <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="animate-spin rounded-full h-12 w-12 border-t-4 border-b-4 border-blue-500"></div>
        </div>
      </Layout>
    )
  }

  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[80vh] bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-2">
        <div className="w-full max-w-lg bg-white/90 shadow-xl rounded-2xl p-8 border border-blue-100 backdrop-blur-md">
          <h1 className="text-3xl font-extrabold text-blue-700 mb-2 text-center tracking-tight">Mi Perfil</h1>
          <p className="text-center text-gray-500 mb-8">Gestiona tu información personal</p>
          <form onSubmit={saveProfile} className="space-y-7">
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Email</label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full p-3 border border-gray-200 rounded-lg bg-gray-100 text-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-200"
              />
              <p className="text-xs text-gray-400 mt-1">El email no se puede cambiar</p>
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">Nombre para mostrar</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Ej: Bruno Guzmán"
                className="w-full p-3 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-200"
                required
              />
              <p className="text-xs text-gray-400 mt-1">Este nombre se mostrará en los grupos y gastos</p>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-500 text-white font-bold rounded-lg shadow-md hover:from-blue-700 hover:to-indigo-600 transition-all duration-200 disabled:opacity-60"
            >
              {saving ? (
                <span className="flex items-center justify-center"><svg className="animate-spin h-5 w-5 mr-2 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z"></path></svg>Guardando...</span>
              ) : 'Guardar Cambios'}
            </button>
            <div className="pt-2">
              {pushEnabled ? (
                <button
                  type="button"
                  onClick={handleDisablePush}
                  disabled={pushLoading}
                  className="w-full py-3 px-4 mt-2 bg-red-500 text-white font-bold rounded-lg shadow-md hover:bg-red-600 transition-all duration-200 disabled:opacity-60"
                >
                  {pushLoading ? 'Procesando...' : 'Desactivar notificaciones'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleEnablePush}
                  disabled={pushLoading}
                  className="w-full py-3 px-4 mt-2 bg-green-600 text-white font-bold rounded-lg shadow-md hover:from-green-700 transition-all duration-200 disabled:opacity-60"
                >
                  {pushLoading ? 'Procesando...' : 'Activar notificaciones'}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </Layout>
  )
}
