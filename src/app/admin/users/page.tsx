'use client'

import { useState, useEffect, useCallback } from 'react'
import DashboardShell from '@/components/DashboardShell'

type UserProfile = {
  id: string
  user_id: string
  full_name: string
  role: string
  domain_access: string
  is_active: boolean
  created_at: string
}

const DOMAIN_LABELS: Record<string, string> = {
  all: 'All Domains', krt: 'KRT', brigade: 'Brigade', acb: 'ACB',
}

const ROLE_META: Record<string, { badge: string }> = {
  admin:  { badge: 'bg-violet-50 text-violet-700 border-violet-200' },
  member: { badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  client: { badge: 'bg-orange-50 text-orange-700 border-orange-200' },
}

function SkeletonRow() {
  return (
    <tr className="border-b border-[#F1F3F9] animate-pulse">
      {[28, 20, 20, 14, 20, 16].map((w, i) => (
        <td key={i} className="px-4 py-4">
          <div className="h-3 bg-[#EEF0F5] rounded-full" style={{ width: `${w * 4}px` }} />
        </td>
      ))}
    </tr>
  )
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteForm, setInviteForm] = useState({ email: '', full_name: '', role: 'member', domain_access: 'krt' })
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState('')

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/users')
    if (res.status === 403) { window.location.href = '/dashboard'; return }
    const json = await res.json()
    setUsers(json.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviteLoading(true)
    setInviteError('')
    const res = await fetch('/api/auth/invite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(inviteForm),
    })
    const json = await res.json()
    if (!res.ok) {
      setInviteError(json.error?.includes('already') ? 'This email is already registered.' : 'Could not send invite. Please try again.')
    } else {
      setInviteForm({ email: '', full_name: '', role: 'member', domain_access: 'krt' })
      setShowInvite(false)
      fetchUsers()
    }
    setInviteLoading(false)
  }

  const toggleActive = async (id: string, is_active: boolean) => {
    await fetch('/api/admin/users', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, is_active: !is_active }),
    })
    fetchUsers()
  }

  return (
    <DashboardShell>
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-[#E5E9F2] px-6 py-3.5 flex items-center justify-between flex-shrink-0">
        <h1 className="text-base font-semibold text-[#1E2A3B]">User Management</h1>
        <button
          onClick={() => { setShowInvite(true); setInviteError('') }}
          className="flex items-center gap-2 px-4 py-2 bg-[#3B6EF0] text-white rounded-xl text-sm font-semibold hover:bg-[#2a5cd4] transition-all shadow-sm shadow-[#3B6EF0]/25"
        >
          <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
            <path d="M6 1v10M1 6h10" stroke="white" strokeWidth="1.8" strokeLinecap="round"/>
          </svg>
          Invite User
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-6">
        {/* Invite Modal */}
        {showInvite && (
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeInUp">
            <div className="bg-white rounded-2xl border border-[#E5E9F2] shadow-2xl p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-base font-bold text-[#1E2A3B]">Invite a new user</h2>
                <button onClick={() => setShowInvite(false)} className="w-7 h-7 flex items-center justify-center rounded-lg text-[#9BAABB] hover:text-[#1E2A3B] hover:bg-[#F4F6FB] transition-colors">
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M1 1l10 10M11 1L1 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </button>
              </div>
              <form onSubmit={handleInvite} className="space-y-4">
                {[
                  { label: 'Full name', key: 'full_name', type: 'text', placeholder: 'Rahul Sharma' },
                  { label: 'Email address', key: 'email', type: 'email', placeholder: 'rahul@company.com' },
                ].map(({ label, key, type, placeholder }) => (
                  <div key={key}>
                    <label className="block text-xs font-semibold text-[#6B7A99] uppercase tracking-wide mb-1.5">{label}</label>
                    <input
                      type={type}
                      required
                      value={inviteForm[key as keyof typeof inviteForm]}
                      onChange={e => setInviteForm(f => ({ ...f, [key]: e.target.value }))}
                      placeholder={placeholder}
                      className="w-full border border-[#E5E9F2] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#3B6EF0] focus:ring-2 focus:ring-[#3B6EF0]/10 transition-all"
                    />
                  </div>
                ))}
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Role', key: 'role', options: [{ v: 'member', l: 'Member (internal)' }, { v: 'client', l: 'Client (view only)' }, { v: 'admin', l: 'Admin' }] },
                    { label: 'Domain access', key: 'domain_access', options: [{ v: 'krt', l: 'KRT' }, { v: 'brigade', l: 'Brigade' }, { v: 'acb', l: 'ACB' }, { v: 'all', l: 'All Domains' }] },
                  ].map(({ label, key, options }) => (
                    <div key={key}>
                      <label className="block text-xs font-semibold text-[#6B7A99] uppercase tracking-wide mb-1.5">{label}</label>
                      <select
                        value={inviteForm[key as keyof typeof inviteForm]}
                        onChange={e => setInviteForm(f => ({ ...f, [key]: e.target.value }))}
                        className="w-full border border-[#E5E9F2] rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-[#3B6EF0] bg-white cursor-pointer"
                      >
                        {options.map(o => <option key={o.v} value={o.v}>{o.l}</option>)}
                      </select>
                    </div>
                  ))}
                </div>

                {inviteError && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-3 py-2.5">{inviteError}</div>
                )}

                <div className="flex gap-3 pt-1">
                  <button type="button" onClick={() => setShowInvite(false)}
                    className="flex-1 px-4 py-2.5 border border-[#E5E9F2] rounded-xl text-sm font-medium text-[#6B7A99] hover:bg-[#F4F6FB] transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={inviteLoading}
                    className="flex-1 px-4 py-2.5 bg-[#3B6EF0] text-white rounded-xl text-sm font-semibold hover:bg-[#2a5cd4] disabled:opacity-50 transition-all">
                    {inviteLoading ? 'Sending…' : 'Send invite'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Users table */}
        <div className="bg-white rounded-2xl border border-[#E5E9F2] overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-[#E5E9F2] flex items-center justify-between">
            <div>
              <h2 className="text-sm font-semibold text-[#1E2A3B]">All Users</h2>
              <p className="text-xs text-[#9BAABB] mt-0.5">{users.length} users total</p>
            </div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F8F9FC] border-b border-[#E5E9F2]">
                {['Name', 'Role', 'Domain Access', 'Status', 'Joined', 'Actions'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#9BAABB] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F3F9]">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-[#9BAABB] text-sm">No users yet. Invite someone to get started.</td>
                </tr>
              ) : (
                users.map(u => (
                  <tr key={u.id} className="hover:bg-[#F8F9FC] transition-colors duration-100">
                    <td className="px-4 py-3.5">
                      <div className="font-semibold text-[#1E2A3B] text-sm">{u.full_name}</div>
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full border text-xs font-medium capitalize ${ROLE_META[u.role]?.badge ?? 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-[#4A5568]">{DOMAIN_LABELS[u.domain_access] ?? u.domain_access}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${
                        u.is_active
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-gray-50 text-gray-500 border-gray-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-xs text-[#9BAABB]">
                      {new Date(u.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                    </td>
                    <td className="px-4 py-3.5">
                      <button
                        onClick={() => toggleActive(u.id, u.is_active)}
                        className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-all ${
                          u.is_active
                            ? 'border-red-200 text-red-600 hover:bg-red-50'
                            : 'border-emerald-200 text-emerald-600 hover:bg-emerald-50'
                        }`}
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardShell>
  )
}
