'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function SetPasswordPage() {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isReset, setIsReset] = useState(false)
  const router = useRouter()

  useEffect(() => {
    if (window.location.hash.includes('type=recovery')) setIsReset(true)
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password.length < 8) {
      setError('Password must be at least 8 characters')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match')
      return
    }

    setLoading(true)
    const supabase = createClient()
    const { error } = await supabase.auth.updateUser({ password })

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
          <h1 className="text-xl font-bold text-[#1E2A3B]">{isReset ? 'Set a new password' : 'Set your password'}</h1>
          <p className="text-sm text-[#6B7A99] mt-1">{isReset ? 'Choose a new password for your account' : 'Choose a password to activate your account'}</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-[#1E2A3B] mb-1.5">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Min. 8 characters"
              className="w-full border border-[#E5E9F2] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#3B6EF0] text-[#1E2A3B]"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-[#1E2A3B] mb-1.5">Confirm password</label>
            <input
              type="password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
              placeholder="Repeat password"
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
            {loading ? 'Saving...' : 'Set password & continue'}
          </button>
        </form>
      </div>
    </div>
  )
}
