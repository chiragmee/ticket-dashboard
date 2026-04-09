'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showReset, setShowReset] = useState(false)
  const [resetEmail, setResetEmail] = useState('')
  const [resetMsg, setResetMsg] = useState('')
  const [resetLoading, setResetLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      if (error.message.toLowerCase().includes('invalid') || error.message.toLowerCase().includes('credentials')) {
        setError('Incorrect email or password. Please try again.')
      } else if (error.message.toLowerCase().includes('email')) {
        setError('Please enter a valid email address.')
      } else {
        setError('Something went wrong. Please try again in a moment.')
      }
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setResetLoading(true)
    setResetMsg('')

    const supabase = createClient()
    const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
      redirectTo: `${window.location.origin}/set-password`,
    })

    if (error) {
      setResetMsg('Could not send reset email. Please try again.')
    } else {
      setResetMsg(`A password reset link has been sent to ${resetEmail}. Check your inbox.`)
    }
    setResetLoading(false)
  }

  return (
    <div className="min-h-screen bg-[#F4F6FB] flex items-center justify-center">
      <div className="bg-white rounded-2xl border border-[#E5E9F2] shadow-sm p-8 w-full max-w-sm">
        <div className="mb-8">
          <div className="w-10 h-10 bg-[#3B6EF0] rounded-xl flex items-center justify-center mb-4">
            <span className="text-white font-bold text-sm">TV</span>
          </div>
          {showReset ? (
            <>
              <h1 className="text-xl font-bold text-[#1E2A3B]">Reset your password</h1>
              <p className="text-sm text-[#6B7A99] mt-1">We'll send a reset link to your email</p>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-[#1E2A3B]">Sign in to TicketView</h1>
              <p className="text-sm text-[#6B7A99] mt-1">Enter your credentials to continue</p>
            </>
          )}
        </div>

        {showReset ? (
          <form onSubmit={handleReset} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1E2A3B] mb-1.5">Email address</label>
              <input
                type="email"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full border border-[#E5E9F2] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#3B6EF0] text-[#1E2A3B]"
              />
            </div>

            {resetMsg && (
              <div className={`text-sm rounded-lg px-3 py-2 border ${
                resetMsg.includes('sent')
                  ? 'text-green-700 bg-green-50 border-green-200'
                  : 'text-red-600 bg-red-50 border-red-200'
              }`}>
                {resetMsg}
              </div>
            )}

            <button
              type="submit"
              disabled={resetLoading}
              className="w-full bg-[#3B6EF0] text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {resetLoading ? 'Sending...' : 'Send reset link'}
            </button>

            <button
              type="button"
              onClick={() => { setShowReset(false); setResetMsg('') }}
              className="w-full text-sm text-[#6B7A99] hover:text-[#1E2A3B] transition-colors"
            >
              ← Back to sign in
            </button>
          </form>
        ) : (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-[#1E2A3B] mb-1.5">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full border border-[#E5E9F2] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#3B6EF0] text-[#1E2A3B]"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-[#1E2A3B]">Password</label>
                <button
                  type="button"
                  onClick={() => { setShowReset(true); setResetEmail(email) }}
                  className="text-xs text-[#3B6EF0] hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                placeholder="••••••••"
                className="w-full border border-[#E5E9F2] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#3B6EF0] text-[#1E2A3B]"
              />
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-[#3B6EF0] text-white rounded-lg py-2.5 text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        )}
      </div>
    </div>
  )
}
