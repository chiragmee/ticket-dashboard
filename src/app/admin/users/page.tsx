'use client'

import { useState, useEffect, useCallback } from 'react'

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
  all: 'All Domains',
  krt: 'KRT',
  brigade: 'Brigade',
  acb: 'ACB',
}

const ROLE_COLORS: Record<string, string> = {
  admin: 'bg-purple-100 text-purple-700',
  member: 'bg-blue-100 text-blue-700',
  client: 'bg-orange-100 text-orange-700',
}

export default function UsersPage() {
  const [users, setUsers] = useState<UserProfile[]>([])
  const [loading, setLoading] = useState(true)
  const [showInvite, setShowInvite] = useState(false)
  const [inviteForm, setInviteForm] = useState({
    email: '', full_name: '', role: 'member', domain_access: 'krt',
  })
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteMsg, setInviteMsg] = useState('')
  const [inviteError, setInviteError] = useState('')

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/admin/users')
    const json = await res.json()
    setUsers(json.data ?? [])
    setLoading(false)
  }, [])

  useEffect(() => { fetchUsers() }, [fetchUsers])

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setInviteLoading(true)
    setInviteMsg('')
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
    <div className="min-h-screen bg-[#F4F6FB]">
      {/* Top bar */}
      <header className="bg-white border-b border-[#E5E9F2] px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <a href="/dashboard" className="text-sm text-[#6B7A99] hover:text-[#1E2A3B]">← Dashboard</a>
          <h1 className="text-lg font-semibold text-[#1E2A3B]">User Management</h1>
        </div>
        <button
          onClick={() => { setShowInvite(true); setInviteMsg(''); setInviteError('') }}
          className="px-4 py-2 bg-[#3B6EF0] text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          + Invite User
        </button>
      </header>

      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {/* Invite Modal */}
        {showInvite && (
          <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
            <div className="bg-white rounded-2xl border border-[#E5E9F2] shadow-xl p-6 w-full max-w-md">
              <h2 className="text-base font-semibold text-[#1E2A3B] mb-4">Invite a new user</h2>
              <form onSubmit={handleInvite} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-[#1E2A3B] mb-1.5">Full name</label>
                  <input
                    type="text"
                    required
                    value={inviteForm.full_name}
                    onChange={(e) => setInviteForm(f => ({ ...f, full_name: e.target.value }))}
                    placeholder="John Smith"
                    className="w-full border border-[#E5E9F2] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#3B6EF0]"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-[#1E2A3B] mb-1.5">Email address</label>
                  <input
                    type="email"
                    required
                    value={inviteForm.email}
                    onChange={(e) => setInviteForm(f => ({ ...f, email: e.target.value }))}
                    placeholder="john@company.com"
                    className="w-full border border-[#E5E9F2] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#3B6EF0]"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-[#1E2A3B] mb-1.5">Role</label>
                    <select
                      value={inviteForm.role}
                      onChange={(e) => setInviteForm(f => ({ ...f, role: e.target.value }))}
                      className="w-full border border-[#E5E9F2] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#3B6EF0]"
                    >
                      <option value="member">Member (internal)</option>
                      <option value="client">Client (view only)</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-[#1E2A3B] mb-1.5">Domain access</label>
                    <select
                      value={inviteForm.domain_access}
                      onChange={(e) => setInviteForm(f => ({ ...f, domain_access: e.target.value }))}
                      className="w-full border border-[#E5E9F2] rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-[#3B6EF0]"
                    >
                      <option value="krt">KRT</option>
                      <option value="brigade">Brigade</option>
                      <option value="acb">ACB</option>
                      <option value="all">All Domains</option>
                    </select>
                  </div>
                </div>

                {inviteError && (
                  <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{inviteError}</div>
                )}
                {inviteMsg && (
                  <div className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">{inviteMsg}</div>
                )}

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowInvite(false)}
                    className="flex-1 px-4 py-2 border border-[#E5E9F2] rounded-lg text-sm text-[#6B7A99] hover:bg-[#F4F6FB]"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={inviteLoading}
                    className="flex-1 px-4 py-2 bg-[#3B6EF0] text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                  >
                    {inviteLoading ? 'Sending...' : 'Send invite'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Users table */}
        <div className="bg-white rounded-xl border border-[#E5E9F2] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E5E9F2]">
            <h2 className="text-sm font-semibold text-[#1E2A3B]">All Users</h2>
            <p className="text-xs text-[#6B7A99] mt-0.5">{users.length} users total</p>
          </div>

          {loading ? (
            <div className="p-8 text-center text-sm text-[#6B7A99]">Loading...</div>
          ) : users.length === 0 ? (
            <div className="p-8 text-center text-sm text-[#6B7A99]">No users yet. Invite someone to get started.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-[#F4F6FB]">
                <tr>
                  {['Name', 'Role', 'Domain Access', 'Status', 'Joined', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#6B7A99] uppercase">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E9F2]">
                {users.map(u => (
                  <tr key={u.id} className="hover:bg-[#F4F6FB]">
                    <td className="px-4 py-3">
                      <div className="font-medium text-[#1E2A3B]">{u.full_name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${ROLE_COLORS[u.role] ?? 'bg-gray-100 text-gray-600'}`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#1E2A3B]">{DOMAIN_LABELS[u.domain_access] ?? u.domain_access}</td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${u.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                        {u.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[#6B7A99]">{new Date(u.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => toggleActive(u.id, u.is_active)}
                        className={`text-xs px-2 py-1 rounded border transition-colors ${
                          u.is_active
                            ? 'border-red-200 text-red-600 hover:bg-red-50'
                            : 'border-green-200 text-green-600 hover:bg-green-50'
                        }`}
                      >
                        {u.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
