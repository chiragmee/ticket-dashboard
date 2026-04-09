'use client'

import { useState, useCallback, useEffect } from 'react'
import { useTicketRealtime } from '@/hooks/useTicketRealtime'

type Ticket = {
  id: number
  zendesk_id: number
  subject: string
  status: string
  priority: string
  category: string
  domain: string
  requester_name: string
  requester_email: string
  assignee_name: string
  zendesk_created_at: string
  sla_breach_at: string | null
}

type Summary = {
  total: number
  open: number
  in_progress: number
  resolved: number
  overdue: number
  by_category: Record<string, number>
}

type RealtimeEvent = {
  id: string
  type: 'INSERT' | 'UPDATE'
  ticket: Ticket
  timestamp: Date
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  pending: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-purple-100 text-purple-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-600',
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-500',
  high: 'bg-orange-400',
  normal: 'bg-blue-400',
  low: 'bg-gray-300',
}

const CATEGORY_COLORS: Record<string, string> = {
  bug: 'bg-red-100 text-red-700',
  feature: 'bg-blue-100 text-blue-700',
  query: 'bg-gray-100 text-gray-700',
  enhancement: 'bg-purple-100 text-purple-700',
  other: 'bg-yellow-100 text-yellow-700',
}

function KPICard({
  label,
  value,
  active,
  onClick,
  color,
}: {
  label: string
  value: number
  active: boolean
  onClick: () => void
  color: string
}) {
  return (
    <button
      onClick={onClick}
      className={`flex-1 rounded-xl p-4 text-left border transition-all ${
        active ? `${color} border-transparent shadow-md` : 'bg-white border-[#E5E9F2] hover:shadow-sm'
      }`}
    >
      <div className="text-2xl font-bold text-[#1E2A3B]">{value}</div>
      <div className="text-sm text-[#6B7A99] mt-1">{label}</div>
    </button>
  )
}

function DonutChart({ summary }: { summary: Summary }) {
  const total = summary.total || 1
  const slices = [
    { label: 'Open', value: summary.open, color: '#3B6EF0' },
    { label: 'In Progress', value: summary.in_progress, color: '#A855F7' },
    { label: 'Resolved', value: summary.resolved, color: '#22C55E' },
    { label: 'Overdue', value: summary.overdue, color: '#EF4444' },
  ]

  let cumulative = 0
  const radius = 60
  const circumference = 2 * Math.PI * radius

  return (
    <div className="bg-white rounded-xl border border-[#E5E9F2] p-5">
      <h3 className="text-sm font-semibold text-[#1E2A3B] mb-4">Status Breakdown</h3>
      <div className="flex items-center gap-6">
        <svg width="140" height="140" viewBox="0 0 140 140">
          <circle cx="70" cy="70" r={radius} fill="none" stroke="#F4F6FB" strokeWidth="20" />
          {slices.map((slice) => {
            const pct = slice.value / total
            const dash = pct * circumference
            const offset = circumference - cumulative * circumference
            cumulative += pct
            return (
              <circle
                key={slice.label}
                cx="70"
                cy="70"
                r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth="20"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={offset}
                transform="rotate(-90 70 70)"
              />
            )
          })}
          <text x="70" y="65" textAnchor="middle" className="text-lg" fontSize="18" fontWeight="bold" fill="#1E2A3B">
            {total}
          </text>
          <text x="70" y="82" textAnchor="middle" fontSize="10" fill="#6B7A99">
            Total
          </text>
        </svg>
        <div className="space-y-2">
          {slices.map((s) => (
            <div key={s.label} className="flex items-center gap-2 text-sm">
              <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: s.color }} />
              <span className="text-[#6B7A99]">{s.label}</span>
              <span className="font-medium text-[#1E2A3B] ml-auto">{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

function CategoryBars({ byCategory, total }: { byCategory: Record<string, number>; total: number }) {
  const colors: Record<string, string> = {
    bug: '#EF4444',
    feature: '#3B6EF0',
    query: '#6B7A99',
    enhancement: '#A855F7',
    other: '#F59E0B',
  }

  return (
    <div className="bg-white rounded-xl border border-[#E5E9F2] p-5">
      <h3 className="text-sm font-semibold text-[#1E2A3B] mb-4">By Category</h3>
      <div className="space-y-3">
        {Object.entries(byCategory).map(([cat, count]) => (
          <div key={cat}>
            <div className="flex justify-between text-sm mb-1">
              <span className="capitalize text-[#1E2A3B]">{cat}</span>
              <span className="text-[#6B7A99]">{count}</span>
            </div>
            <div className="h-2 bg-[#F4F6FB] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all"
                style={{
                  width: `${total ? (count / total) * 100 : 0}%`,
                  backgroundColor: colors[cat] ?? '#6B7A99',
                }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function TicketDashboard({
  initialTickets,
  initialSummary,
  initialCount,
}: {
  initialTickets: Ticket[]
  initialSummary: Summary
  initialCount: number
}) {
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets)
  const [summary, setSummary] = useState<Summary>(initialSummary)
  const [totalCount, setTotalCount] = useState(initialCount)
  const [statusFilter, setStatusFilter] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [domainFilter, setDomainFilter] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(Math.ceil(initialCount / 20))
  const [loading, setLoading] = useState(false)
  const [events, setEvents] = useState<RealtimeEvent[]>([])

  const fetchTickets = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), pageSize: '20' })
    if (statusFilter) params.set('status', statusFilter)
    if (categoryFilter) params.set('category', categoryFilter)
    if (domainFilter) params.set('domain', domainFilter)
    if (search) params.set('search', search)

    const res = await fetch(`/api/tickets?${params}`)
    const json = await res.json()
    setTickets(json.data ?? [])
    setTotalCount(json.count ?? 0)
    setTotalPages(json.totalPages ?? 1)
    setLoading(false)
  }, [page, statusFilter, categoryFilter, domainFilter, search])

  useEffect(() => { fetchTickets() }, [fetchTickets])

  const refreshSummary = useCallback(async () => {
    const res = await fetch('/api/tickets/summary')
    const json = await res.json()
    setSummary(json)
  }, [])

  const handleInsert = useCallback((ticket: Record<string, unknown>) => {
    const t = ticket as Ticket
    setEvents((prev) => [{ id: String(t.zendesk_id), type: 'INSERT', ticket: t, timestamp: new Date() }, ...prev.slice(0, 4)])
    setTickets((prev) => [t, ...prev.slice(0, 19)])
    setTotalCount((c) => c + 1)
    refreshSummary()
  }, [refreshSummary])

  const handleUpdate = useCallback((ticket: Record<string, unknown>) => {
    const t = ticket as Ticket
    setEvents((prev) => [{ id: String(t.zendesk_id) + Date.now(), type: 'UPDATE', ticket: t, timestamp: new Date() }, ...prev.slice(0, 4)])
    setTickets((prev) => prev.map((tk) => (tk.zendesk_id === t.zendesk_id ? t : tk)))
    refreshSummary()
  }, [refreshSummary])

  const { isConnected } = useTicketRealtime({ onInsert: handleInsert, onUpdate: handleUpdate })

  const kpiCards = [
    { label: 'Total', value: summary.total, key: '', color: 'bg-blue-50' },
    { label: 'Open', value: summary.open, key: 'open', color: 'bg-blue-50' },
    { label: 'In Progress', value: summary.in_progress, key: 'in_progress', color: 'bg-purple-50' },
    { label: 'Resolved', value: summary.resolved, key: 'resolved', color: 'bg-green-50' },
    { label: 'Overdue', value: summary.overdue, key: 'overdue', color: 'bg-red-50' },
  ]

  return (
    <div className="flex h-screen bg-[#F4F6FB]">
      {/* Sidebar */}
      <aside className="w-56 bg-[#1A2038] flex-shrink-0 flex flex-col">
        <div className="p-6 border-b border-white/10">
          <div className="text-white font-bold text-lg">TicketView</div>
          <div className="text-white/40 text-xs mt-1">Zendesk Dashboard</div>
        </div>
        <nav className="p-4 space-y-1 flex-1">
          {[
            { label: 'Dashboard', href: '/dashboard', active: true },
            { label: 'Sync', href: '/dashboard/sync', active: false },
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={`block px-3 py-2 rounded-lg text-sm transition-colors ${
                item.active ? 'bg-[#3B6EF0] text-white' : 'text-white/60 hover:text-white hover:bg-white/10'
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-[#E5E9F2] px-6 py-4 flex items-center justify-between">
          <h1 className="text-lg font-semibold text-[#1E2A3B]">Ticket Dashboard</h1>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2 text-sm text-[#6B7A99]">
              <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
              {isConnected ? 'Live' : 'Connecting...'}
            </div>
            <input
              type="text"
              placeholder="Search tickets..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1) }}
              className="border border-[#E5E9F2] rounded-lg px-3 py-1.5 text-sm w-56 focus:outline-none focus:border-[#3B6EF0]"
            />
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* KPI Cards */}
          <div className="flex gap-4">
            {kpiCards.map((card) => (
              <KPICard
                key={card.label}
                label={card.label}
                value={card.value}
                active={statusFilter === card.key}
                onClick={() => { setStatusFilter(statusFilter === card.key ? '' : card.key); setPage(1) }}
                color={card.color}
              />
            ))}
          </div>

          {/* Charts */}
          <div className="grid grid-cols-2 gap-4">
            <DonutChart summary={summary} />
            <CategoryBars byCategory={summary.by_category} total={summary.total} />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="flex gap-1 bg-white border border-[#E5E9F2] rounded-lg p-1">
              {['', 'open', 'in_progress', 'resolved', 'closed'].map((s) => (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setPage(1) }}
                  className={`px-3 py-1 rounded text-sm transition-colors ${
                    statusFilter === s ? 'bg-[#3B6EF0] text-white' : 'text-[#6B7A99] hover:text-[#1E2A3B]'
                  }`}
                >
                  {s === '' ? 'All' : s.replace('_', ' ')}
                </button>
              ))}
            </div>
            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1) }}
              className="border border-[#E5E9F2] rounded-lg px-3 py-1.5 text-sm bg-white text-[#1E2A3B] focus:outline-none focus:border-[#3B6EF0]"
            >
              <option value="">All Categories</option>
              {['bug', 'feature', 'query', 'enhancement', 'other'].map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
            <select
              value={domainFilter}
              onChange={(e) => { setDomainFilter(e.target.value); setPage(1) }}
              className="border border-[#E5E9F2] rounded-lg px-3 py-1.5 text-sm bg-white text-[#1E2A3B] focus:outline-none focus:border-[#3B6EF0]"
            >
              <option value="">All Domains</option>
              <option value="krt">KRT</option>
              <option value="brigade">Brigade</option>
              <option value="acb">ACB</option>
              <option value="other">Other</option>
            </select>
          </div>

          {/* Table */}
          <div className="bg-white rounded-xl border border-[#E5E9F2] overflow-hidden">
            {loading ? (
              <div className="p-8 text-center text-[#6B7A99] text-sm">Loading...</div>
            ) : tickets.length === 0 ? (
              <div className="p-8 text-center text-[#6B7A99] text-sm">No tickets found.</div>
            ) : (
              <table className="w-full text-sm">
                <thead className="bg-[#F4F6FB] border-b border-[#E5E9F2]">
                  <tr>
                    {['ID', 'Subject', 'Domain', 'Category', 'Priority', 'Status', 'Requester', 'Assignee', 'Created', 'SLA'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#6B7A99] uppercase tracking-wide">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#E5E9F2]">
                  {tickets.map((t) => (
                    <tr key={t.id} className="hover:bg-[#F4F6FB] transition-colors">
                      <td className="px-4 py-3 text-[#6B7A99] font-mono">#{t.zendesk_id}</td>
                      <td className="px-4 py-3 text-[#1E2A3B] max-w-[200px] truncate">{t.subject}</td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${
                          t.domain === 'krt' ? 'bg-indigo-100 text-indigo-700' :
                          t.domain === 'brigade' ? 'bg-orange-100 text-orange-700' :
                          t.domain === 'acb' ? 'bg-teal-100 text-teal-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>
                          {t.domain === 'krt' ? 'KRT' : t.domain === 'brigade' ? 'Brigade' : t.domain === 'acb' ? 'ACB' : 'Other'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${CATEGORY_COLORS[t.category] ?? 'bg-gray-100 text-gray-600'}`}>
                          {t.category}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-block w-2.5 h-2.5 rounded-full ${PRIORITY_COLORS[t.priority] ?? 'bg-gray-300'}`} title={t.priority} />
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded text-xs font-medium ${STATUS_COLORS[t.status] ?? 'bg-gray-100 text-gray-600'}`}>
                          {t.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-[#6B7A99] max-w-[120px] truncate">{t.requester_name || t.requester_email}</td>
                      <td className="px-4 py-3 text-[#6B7A99]">{t.assignee_name || '—'}</td>
                      <td className="px-4 py-3 text-[#6B7A99] whitespace-nowrap">
                        {new Date(t.zendesk_created_at).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3">
                        {t.sla_breach_at ? (
                          <span className={`text-xs font-medium ${new Date(t.sla_breach_at) < new Date() ? 'text-red-500' : 'text-green-500'}`}>
                            {new Date(t.sla_breach_at) < new Date() ? 'Breached' : 'On track'}
                          </span>
                        ) : (
                          <span className="text-[#6B7A99]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-[#6B7A99]">
              <span>{totalCount} tickets total</span>
              <div className="flex gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3 py-1.5 border border-[#E5E9F2] rounded-lg hover:bg-white disabled:opacity-40"
                >
                  Previous
                </button>
                <span className="px-3 py-1.5">Page {page} of {totalPages}</span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3 py-1.5 border border-[#E5E9F2] rounded-lg hover:bg-white disabled:opacity-40"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Live Activity Feed */}
      <div className="fixed bottom-6 right-6 w-72 bg-white rounded-xl border border-[#E5E9F2] shadow-lg overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E5E9F2] flex items-center justify-between">
          <span className="text-sm font-semibold text-[#1E2A3B]">Live Activity</span>
          <span className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
        </div>
        <div className="divide-y divide-[#E5E9F2] max-h-64 overflow-y-auto">
          {events.length === 0 ? (
            <div className="px-4 py-6 text-center text-xs text-[#6B7A99]">Waiting for live events...</div>
          ) : (
            events.map((ev) => (
              <div key={ev.id} className="px-4 py-2">
                <div className="flex items-center gap-2">
                  <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${ev.type === 'INSERT' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                    {ev.type === 'INSERT' ? 'New' : 'Updated'}
                  </span>
                  <span className="text-xs text-[#6B7A99]">#{ev.ticket.zendesk_id}</span>
                </div>
                <div className="text-xs text-[#1E2A3B] mt-1 truncate">{ev.ticket.subject}</div>
                <div className="text-xs text-[#6B7A99] mt-0.5">{ev.timestamp.toLocaleTimeString()}</div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
