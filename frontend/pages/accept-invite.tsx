import { useEffect, useState } from 'react'
import { useRouter } from 'next/router'
import Layout from '../components/Layout'
import { supabase } from '../lib/supabaseClient'

export default function AcceptInvite() {
  const router = useRouter()
  const { token } = router.query
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [groupId, setGroupId] = useState<string | null>(null)
  const [needsAuth, setNeedsAuth] = useState(false)

  useEffect(() => {
    // Wait for the router to be ready
    if (!router.isReady) return
    if (!token) return

    async function processInvitation() {
      try {
        // Check if there is a session
        const { data: { session } } = await supabase.auth.getSession()
        
        if (!session) {
          setNeedsAuth(true)
          setLoading(false)
          // Save token in localStorage to use after login
          localStorage.setItem('pending_invitation_token', token as string)
          return
        }

        // Call the function that accepts the invitation
        const { data, error: rpcError } = await supabase
          .rpc('accept_invitation', { invitation_token: token })

        if (rpcError) {
          setError(rpcError.message)
          setLoading(false)
          return
        }

        const result = data as { success: boolean; message: string; group_id?: string }

        if (!result.success) {
          setError(result.message)
          setLoading(false)
          return
        }

        // Success
        setSuccess(true)
        setGroupId(result.group_id || null)
        setLoading(false)

        // Redirect to the group after 2 seconds
        if (result.group_id) {
          setTimeout(() => {
            router.push(`/groups/${result.group_id}`)
          }, 2000)
        }
      } catch (err: any) {
        setError(err.message || 'Error processing the invitation')
        setLoading(false)
      }
    }

    processInvitation()
  }, [token, router.isReady])

  // Handle acceptance after login
  useEffect(() => {
    const pendingToken = localStorage.getItem('pending_invitation_token')
    if (pendingToken && !token) {
      localStorage.removeItem('pending_invitation_token')
      router.push(`/accept-invite?token=${pendingToken}`)
    }
  }, [token, router])

  if (loading) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Processing invitation...</p>
          </div>
        </div>
      </Layout>
    )
  }

  if (needsAuth) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
            <div className="text-center mb-6">
              <div className="text-6xl mb-4">📧</div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Invitation Received
              </h1>
              <p className="text-gray-600">
                To accept this invitation, you must first sign in or create an account.
              </p>
            </div>
            
            <div className="space-y-3">
              <button
                onClick={() => router.push('/auth/login')}
                className="w-full bg-blue-600 text-white rounded-xl py-3 font-semibold hover:bg-blue-700 transition"
              >
                Sign In
              </button>
              <button
                onClick={() => router.push('/auth/register')}
                className="w-full bg-white text-blue-600 border-2 border-blue-600 rounded-xl py-3 font-semibold hover:bg-blue-50 transition"
              >
                Create Account
              </button>
            </div>

            <p className="text-sm text-gray-500 text-center mt-4">
              Your invitation will be saved and processed automatically after you sign in.
            </p>
          </div>
        </div>
      </Layout>
    )
  }

  if (error) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-red-50 to-pink-100">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="text-6xl mb-4">❌</div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                Error
              </h1>
              <p className="text-red-600 mb-6">{error}</p>
              <button
                onClick={() => router.push('/dashboard')}
                className="bg-blue-600 text-white rounded-xl px-6 py-3 font-semibold hover:bg-blue-700 transition"
              >
                Go to Dashboard
              </button>
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  if (success) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 to-emerald-100">
          <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full mx-4">
            <div className="text-center">
              <div className="text-6xl mb-4">✅</div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2">
                You joined the group!
              </h1>
              <p className="text-gray-600 mb-6">
                You will be redirected to the group in a few seconds...
              </p>
              {groupId && (
                <button
                  onClick={() => router.push(`/groups/${groupId}`)}
                  className="bg-blue-600 text-white rounded-xl px-6 py-3 font-semibold hover:bg-blue-700 transition"
                >
                  Go to Group Now
                </button>
              )}
            </div>
          </div>
        </div>
      </Layout>
    )
  }

  return null
}
