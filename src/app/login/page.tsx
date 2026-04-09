'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')

    const supabase = createClient()
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      setError(error.message)
      setLoading(false)
      return
    }

    router.push('/dashboard')
    router.refresh()
  }

  return (
    <div className="min-h-screen bg-[#F4F6FB] flex items-center justify-center">
      <div className="bg-white rounded-2xl border border-[#E5E9F2] shadow-sm p-8 w-full max-w-sm">
        <div className="mb-8">
          <div className="w-10 h-10 bg-[#3B6EF0] rounded-xl flex items-center justify-center mb-4">
            <span className="text-white font-bold text-sm">TV</span>
          </div>
          <h1 className="text-xl font-bold text-[#1E2A3B]">Sign in to TicketView</h1>
          <p className="text-sm text-[#6B7A99] mt-1">Enter your credentials to continue</p>
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1E2A3B] mb-1.5">
              Email
            </label>
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
            <label className="block text-sm font-medium text-[#1E2A3B] mb-1.5">
              Password
            </label>
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
      </div>
    </div>
  )
}
