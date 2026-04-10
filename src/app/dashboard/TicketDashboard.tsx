'use client'

import { useState, useCallback, useEffect } from 'react'
import { useTicketRealtime } from '@/hooks/useTicketRealtime'

type UserProfile = {
  role: string
  full_name: string
  domain_access: string
}

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
  csat_score: number | null
}

type Summary = {
  total: number
  open: number
  in_progress: number
  resolved: number
  overdue: number
  by_category: Record<string, number>
  avg_csat: number | null
  csat_count: number
}

type RealtimeEvent = {
  id: string
  type: 'INSERT' | 'UPDATE'
  ticket: Ticket
  timestamp: Date
}

const STATUS_META: Record<string, { dot: string; badge: string; label: string }> = {
  open:        { dot: 'bg-blue-500',   badge: 'bg-blue-50 text-blue-700 border-blue-200',     label: 'Open' },
  pending:     { dot: 'bg-amber-500',  badge: 'bg-amber-50 text-amber-700 border-amber-200',  label: 'Pending' },
  in_progress: { dot: 'bg-violet-500', badge: 'bg-violet-50 text-violet-700 border-violet-200', label: 'In Progress' },
  resolved:    { dot: 'bg-emerald-500',badge: 'bg-emerald-50 text-emerald-700 border-emerald-200', label: 'Resolved' },
  closed:      { dot: 'bg-gray-400',   badge: 'bg-gray-50 text-gray-600 border-gray-200',     label: 'Closed' },
}

const PRIORITY_META: Record<string, { color: string; label: string }> = {
  urgent: { color: 'bg-red-500',    label: 'Urgent' },
  high:   { color: 'bg-orange-400', label: 'High' },
  normal: { color: 'bg-blue-400',   label: 'Normal' },
  low:    { color: 'bg-gray-300',   label: 'Low' },
}

const CATEGORY_META: Record<string, { badge: string }> = {
  bug:         { badge: 'bg-red-50 text-red-700 border-red-200' },
  feature:     { badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  query:       { badge: 'bg-slate-50 text-slate-600 border-slate-200' },
  enhancement: { badge: 'bg-violet-50 text-violet-700 border-violet-200' },
  other:       { badge: 'bg-amber-50 text-amber-700 border-amber-200' },
}

const DOMAIN_META: Record<string, { badge: string; label: string }> = {
  krt:     { badge: 'bg-indigo-50 text-indigo-700 border-indigo-200',  label: 'KRT' },
  brigade: { badge: 'bg-orange-50 text-orange-700 border-orange-200',  label: 'Brigade' },
  acb:     { badge: 'bg-teal-50 text-teal-700 border-teal-200',        label: 'ACB' },
  other:   { badge: 'bg-gray-50 text-gray-600 border-gray-200',        label: 'Other' },
}

const CSAT_EMOJI: Record<number, string> = { 1: '😞', 2: '😕', 3: '😐', 4: '😊', 5: '😄' }

// ─── KPI Card ───────────────────────────────────────────────────────────────
function KPICard({
  label, value, active, onClick, accentColor, icon,
}: {
  label: string; value: number; active: boolean; onClick: () => void; accentColor: string; icon: React.ReactNode
}) {
  return (
    <button
      onClick={onClick}
      className={`relative flex-1 rounded-2xl p-5 text-left border transition-all duration-200 overflow-hidden group ${
        active
          ? 'bg-[#3B6EF0] border-transparent shadow-lg shadow-[#3B6EF0]/25 scale-[1.02]'
          : 'bg-white border-[#E5E9F2] hover:shadow-md hover:border-[#3B6EF0]/30 hover:scale-[1.01]'
      }`}
    >
      <div className={`absolute top-3 right-3 w-8 h-8 rounded-xl flex items-center justify-center transition-colors duration-200 ${active ? 'bg-white/20' : accentColor}`}>
        {icon}
      </div>
      <div className={`text-3xl font-bold tabular-nums transition-colors duration-200 ${active ? 'text-white' : 'text-[#1E2A3B]'}`}>
        {value}
      </div>
      <div className={`text-sm font-medium mt-1.5 transition-colors duration-200 ${active ? 'text-white/80' : 'text-[#6B7A99]'}`}>
        {label}
      </div>
    </button>
  )
}

// ─── Skeleton row ────────────────────────────────────────────────────────────
function SkeletonRow() {
  return (
    <tr className="border-b border-[#E5E9F2] animate-pulse">
      {[12, 44, 16, 16, 8, 18, 24, 20, 16, 10, 8].map((w, i) => (
        <td key={i} className="px-4 py-4">
          <div className={`h-3.5 bg-[#EEF0F5] rounded-full w-${w}`} style={{ width: `${w * 4}px` }} />
        </td>
      ))}
    </tr>
  )
}

// ─── Donut Chart ─────────────────────────────────────────────────────────────
function DonutChart({ summary }: { summary: Summary }) {
  const total = summary.total || 1
  const slices = [
    { label: 'Open',       value: summary.open,        color: '#3B6EF0' },
    { label: 'In Progress',value: summary.in_progress, color: '#8B5CF6' },
    { label: 'Resolved',   value: summary.resolved,    color: '#10B981' },
    { label: 'Overdue',    value: summary.overdue,      color: '#EF4444' },
  ]
  let cumulative = 0
  const radius = 58
  const circumference = 2 * Math.PI * radius

  return (
    <div className="bg-white rounded-2xl border border-[#E5E9F2] p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-[#1E2A3B] mb-4">Status Breakdown</h3>
      <div className="flex items-center gap-6">
        <svg width="136" height="136" viewBox="0 0 136 136">
          <circle cx="68" cy="68" r={radius} fill="none" stroke="#F1F3F9" strokeWidth="18" />
          {slices.map((slice) => {
            const pct = slice.value / total
            const dash = pct * circumference
            const offset = circumference - cumulative * circumference
            cumulative += pct
            return (
              <circle
                key={slice.label}
                cx="68" cy="68" r={radius}
                fill="none"
                stroke={slice.color}
                strokeWidth="18"
                strokeLinecap="round"
                strokeDasharray={`${dash} ${circumference - dash}`}
                strokeDashoffset={offset}
                transform="rotate(-90 68 68)"
                className="transition-all duration-500"
              />
            )
          })}
          <text x="68" y="62" textAnchor="middle" fontSize="20" fontWeight="700" fill="#1E2A3B">{total}</text>
          <text x="68" y="78" textAnchor="middle" fontSize="10" fill="#9BAABB">Total</text>
        </svg>
        <div className="space-y-2.5 flex-1">
          {slices.map((s) => (
            <div key={s.label} className="flex items-center gap-2.5 text-sm">
              <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
              <span className="text-[#6B7A99] flex-1">{s.label}</span>
              <span className="font-semibold text-[#1E2A3B]">{s.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── Category Bars ───────────────────────────────────────────────────────────
function CategoryBars({ byCategory, total }: { byCategory: Record<string, number>; total: number }) {
  const colors: Record<string, string> = {
    bug: '#EF4444', feature: '#3B6EF0', query: '#64748B', other: '#F59E0B',
  }
  return (
    <div className="bg-white rounded-2xl border border-[#E5E9F2] p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-[#1E2A3B] mb-4">By Category</h3>
      <div className="space-y-3.5">
        {Object.entries(byCategory).map(([cat, count]) => (
          <div key={cat}>
            <div className="flex justify-between text-sm mb-1.5">
              <span className="capitalize font-medium text-[#1E2A3B]">{cat}</span>
              <span className="text-[#6B7A99] tabular-nums">{count}</span>
            </div>
            <div className="h-1.5 bg-[#F1F3F9] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700 ease-out"
                style={{ width: `${total ? (count / total) * 100 : 0}%`, backgroundColor: colors[cat] ?? '#6B7A99' }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────
export default function TicketDashboard({
  initialTickets, initialSummary, initialCount,
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
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(Math.ceil(initialCount / 20))
  const [loading, setLoading] = useState(false)
  const [events, setEvents] = useState<RealtimeEvent[]>([])
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    fetch('/api/auth/profile').then(r => r.json()).then(json => {
      if (json.profile) setUserProfile(json.profile)
    })
  }, [])

  const fetchTickets = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ page: String(page), pageSize: '20' })
    if (statusFilter) params.set('status', statusFilter)
    if (categoryFilter) params.set('category', categoryFilter)
    if (domainFilter) params.set('domain', domainFilter)
    if (dateFrom) params.set('date_from', dateFrom)
    if (dateTo) params.set('date_to', dateTo)
    if (search) params.set('search', search)

    const res = await fetch(`/api/tickets?${params}`)
    const json = await res.json()
    setTickets(json.data ?? [])
    setTotalCount(json.count ?? 0)
    setTotalPages(json.totalPages ?? 1)
    setLoading(false)
  }, [page, statusFilter, categoryFilter, domainFilter, dateFrom, dateTo, search])

  useEffect(() => { fetchTickets() }, [fetchTickets])

  const refreshSummary = useCallback(async () => {
    const res = await fetch('/api/tickets/summary')
    const json = await res.json()
    setSummary(json)
  }, [])

  const addEvent = useCallback((event: RealtimeEvent) => {
    setEvents(prev => [event, ...prev.slice(0, 4)])
    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      setEvents(prev => prev.filter(e => e.id !== event.id))
    }, 4000)
  }, [])

  const handleInsert = useCallback((ticket: Record<string, unknown>) => {
    const t = ticket as Ticket
    addEvent({ id: String(t.zendesk_id), type: 'INSERT', ticket: t, timestamp: new Date() })
    setTickets((prev) => [t, ...prev.slice(0, 19)])
    setTotalCount((c) => c + 1)
    refreshSummary()
  }, [addEvent, refreshSummary])

  const handleUpdate = useCallback((ticket: Record<string, unknown>) => {
    const t = ticket as Ticket
    addEvent({ id: String(t.zendesk_id) + Date.now(), type: 'UPDATE', ticket: t, timestamp: new Date() })
    setTickets((prev) => prev.map((tk) => (tk.zendesk_id === t.zendesk_id ? t : tk)))
    refreshSummary()
  }, [addEvent, refreshSummary])

  const { isConnected } = useTicketRealtime({ onInsert: handleInsert, onUpdate: handleUpdate })

  const kpiCards = [
    {
      label: 'Total', value: summary.total, key: '', accentColor: 'bg-slate-100',
      icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="2" y="2" width="5" height="5" rx="1" stroke="#6B7A99" strokeWidth="1.5"/><rect x="9" y="2" width="5" height="5" rx="1" stroke="#6B7A99" strokeWidth="1.5"/><rect x="2" y="9" width="5" height="5" rx="1" stroke="#6B7A99" strokeWidth="1.5"/><rect x="9" y="9" width="5" height="5" rx="1" stroke="#6B7A99" strokeWidth="1.5"/></svg>
    },
    {
      label: 'Open', value: summary.open, key: 'open', accentColor: 'bg-blue-50',
      icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="#3B6EF0" strokeWidth="1.5"/><path d="M8 5v3l2 1.5" stroke="#3B6EF0" strokeWidth="1.5" strokeLinecap="round"/></svg>
    },
    {
      label: 'In Progress', value: summary.in_progress, key: 'in_progress', accentColor: 'bg-violet-50',
      icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2a6 6 0 0 1 6 6" stroke="#8B5CF6" strokeWidth="1.5" strokeLinecap="round"/><path d="M8 2a6 6 0 1 0 6 6" stroke="#8B5CF6" strokeWidth="1.5" strokeLinecap="round" strokeDasharray="3 3"/></svg>
    },
    {
      label: 'Resolved', value: summary.resolved, key: 'resolved', accentColor: 'bg-emerald-50',
      icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="#10B981" strokeWidth="1.5"/><path d="M5.5 8.5l2 2 3-4" stroke="#10B981" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
    },
    {
      label: 'Overdue', value: summary.overdue, key: 'overdue', accentColor: 'bg-red-50',
      icon: <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2L8 9M8 11.5v.5" stroke="#EF4444" strokeWidth="1.5" strokeLinecap="round"/><circle cx="8" cy="8" r="6" stroke="#EF4444" strokeWidth="1.5"/></svg>
    },
  ]

  return (
    <div className={`flex h-screen bg-[#F4F6FB] transition-opacity duration-500 ${mounted ? 'opacity-100' : 'opacity-0'}`}>

      {/* Sidebar */}
      <aside className="w-56 bg-gradient-to-b from-[#1A2038] to-[#141929] flex-shrink-0 flex flex-col shadow-xl">
        <div className="p-6 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 bg-[#3B6EF0] rounded-lg flex items-center justify-center flex-shrink-0">
              <span className="text-white font-bold text-xs">TV</span>
            </div>
            <div>
              <div className="text-white font-bold text-sm leading-tight">TicketView</div>
              <div className="text-white/40 text-xs">Zendesk Dashboard</div>
            </div>
          </div>
        </div>

        <nav className="p-3 space-y-0.5 flex-1">
          {[
            { label: 'Dashboard', href: '/dashboard', active: true },
            ...(userProfile?.role === 'admin' ? [
              { label: 'SLA Config', href: '/dashboard/sla', active: false },
              { label: 'Sync', href: '/dashboard/sync', active: false },
              { label: 'Manage Users', href: '/admin/users', active: false },
            ] : []),
          ].map((item) => (
            <a
              key={item.label}
              href={item.href}
              className={`flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm transition-all duration-150 ${
                item.active
                  ? 'bg-[#3B6EF0] text-white shadow-md shadow-[#3B6EF0]/30'
                  : 'text-white/50 hover:text-white hover:bg-white/8'
              }`}
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="p-3 border-t border-white/10">
          {userProfile && (
            <div className="px-3 py-2 mb-1">
              <div className="text-white text-sm font-semibold truncate">{userProfile.full_name}</div>
              <div className="text-white/40 text-xs capitalize mt-0.5">{userProfile.role}</div>
            </div>
          )}
          <button
            onClick={async () => {
              await fetch('/api/auth/logout', { method: 'POST' })
              window.location.href = '/login'
            }}
            className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-sm text-white/50 hover:text-white hover:bg-white/8 transition-all duration-150"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M10 3h3a1 1 0 0 1 1 1v8a1 1 0 0 1-1 1h-3M7 11l3-3-3-3M10 8H2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
            Sign out
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">

        {/* Top bar */}
        <header className="bg-white/80 backdrop-blur-sm border-b border-[#E5E9F2] px-6 py-3.5 flex items-center justify-between sticky top-0 z-10">
          <h1 className="text-base font-semibold text-[#1E2A3B]">Ticket Dashboard</h1>
          <div className="flex items-center gap-3">
            {/* Live indicator */}
            <div className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full border transition-all duration-300 ${
              isConnected ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-gray-50 border-gray-200 text-gray-500'
            }`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-500 animate-pulse' : 'bg-gray-400'}`} />
              {isConnected ? 'Live' : 'Connecting'}
            </div>
            {/* Search */}
            <div className="relative">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none" className="absolute left-3 top-1/2 -translate-y-1/2 text-[#9BAABB]">
                <circle cx="6.5" cy="6.5" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M10 10l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                placeholder="Search tickets…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1) }}
                className="border border-[#E5E9F2] rounded-xl pl-8 pr-4 py-2 text-sm w-52 focus:outline-none focus:border-[#3B6EF0] focus:ring-2 focus:ring-[#3B6EF0]/10 transition-all duration-150 bg-[#F8F9FC]"
              />
            </div>
          </div>
        </header>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">

          {/* KPI Cards */}
          <div className="flex gap-3">
            {kpiCards.map((card) => (
              <KPICard
                key={card.label}
                label={card.label}
                value={card.value}
                active={statusFilter === card.key}
                onClick={() => { setStatusFilter(statusFilter === card.key ? '' : card.key); setPage(1) }}
                accentColor={card.accentColor}
                icon={card.icon}
              />
            ))}
          </div>

          {/* CSAT Banner */}
          {summary.avg_csat !== null && summary.avg_csat !== undefined && (
            <div className="bg-gradient-to-r from-amber-50 to-orange-50 rounded-2xl border border-amber-200/60 p-4 flex items-center gap-5 shadow-sm">
              <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center shadow-sm text-2xl flex-shrink-0">
                {summary.avg_csat >= 4.5 ? '😄' : summary.avg_csat >= 3.5 ? '😊' : summary.avg_csat >= 2.5 ? '😐' : summary.avg_csat >= 1.5 ? '😕' : '😞'}
              </div>
              <div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-xl font-bold text-[#1E2A3B]">{summary.avg_csat.toFixed(1)}</span>
                  <span className="text-sm text-[#6B7A99]">/ 5 avg CSAT</span>
                </div>
                <div className="text-xs text-[#9BAABB] mt-0.5">{summary.csat_count} {summary.csat_count === 1 ? 'response' : 'responses'}</div>
              </div>
              <div className="flex gap-0.5 ml-1">
                {[1,2,3,4,5].map((s) => (
                  <span key={s} className={`text-lg transition-colors ${s <= Math.round(summary.avg_csat!) ? 'text-amber-400' : 'text-[#E5E9F2]'}`}>★</span>
                ))}
              </div>
            </div>
          )}

          {/* Charts */}
          <div className="grid grid-cols-2 gap-4">
            <DonutChart summary={summary} />
            <CategoryBars byCategory={summary.by_category} total={summary.total} />
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            {/* Status tabs */}
            <div className="flex gap-1 bg-white border border-[#E5E9F2] rounded-xl p-1 shadow-sm">
              {['', 'open', 'in_progress', 'resolved', 'closed'].map((s) => (
                <button
                  key={s}
                  onClick={() => { setStatusFilter(s); setPage(1) }}
                  className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 ${
                    statusFilter === s
                      ? 'bg-[#3B6EF0] text-white shadow-sm'
                      : 'text-[#6B7A99] hover:text-[#1E2A3B] hover:bg-[#F4F6FB]'
                  }`}
                >
                  {s === '' ? 'All' : s.replace('_', ' ')}
                </button>
              ))}
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value); setPage(1) }}
              className="border border-[#E5E9F2] rounded-xl px-3 py-2 text-xs font-medium bg-white text-[#1E2A3B] focus:outline-none focus:border-[#3B6EF0] focus:ring-2 focus:ring-[#3B6EF0]/10 transition-all shadow-sm cursor-pointer"
            >
              <option value="">All Categories</option>
              {['bug', 'feature', 'query', 'other'].map((c) => (
                <option key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</option>
              ))}
            </select>

            <select
              value={domainFilter}
              onChange={(e) => { setDomainFilter(e.target.value); setPage(1) }}
              className="border border-[#E5E9F2] rounded-xl px-3 py-2 text-xs font-medium bg-white text-[#1E2A3B] focus:outline-none focus:border-[#3B6EF0] focus:ring-2 focus:ring-[#3B6EF0]/10 transition-all shadow-sm cursor-pointer"
            >
              <option value="">All Domains</option>
              <option value="krt">KRT</option>
              <option value="brigade">Brigade</option>
              <option value="acb">ACB</option>
              <option value="other">Other</option>
            </select>

            {/* Date range */}
            <div className="flex items-center gap-2 bg-white border border-[#E5E9F2] rounded-xl px-3 py-1.5 shadow-sm">
              <svg width="12" height="12" viewBox="0 0 14 14" fill="none" className="text-[#9BAABB] flex-shrink-0">
                <rect x="1" y="2" width="12" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
                <path d="M4 1v2M10 1v2M1 5h12" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/>
              </svg>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
                className="text-xs text-[#1E2A3B] bg-transparent focus:outline-none w-28 cursor-pointer"
                title="From date"
              />
              <span className="text-[#D1D9E6] text-xs">→</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
                className="text-xs text-[#1E2A3B] bg-transparent focus:outline-none w-28 cursor-pointer"
                title="To date"
              />
            </div>

            {(statusFilter || categoryFilter || domainFilter || search || dateFrom || dateTo) && (
              <button
                onClick={() => { setStatusFilter(''); setCategoryFilter(''); setDomainFilter(''); setDateFrom(''); setDateTo(''); setSearch(''); setPage(1) }}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-medium text-[#6B7A99] hover:text-red-600 hover:bg-red-50 border border-[#E5E9F2] hover:border-red-200 transition-all duration-150"
              >
                <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                Clear filters
              </button>
            )}
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl border border-[#E5E9F2] overflow-hidden shadow-sm">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[#E5E9F2] bg-[#F8F9FC]">
                  {['ID', 'Subject', 'Domain', 'Category', 'Priority', 'Status', 'Requester', 'Assignee', 'Created', 'SLA', 'CSAT'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#9BAABB] uppercase tracking-wider">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F3F9]">
                {loading ? (
                  Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} />)
                ) : tickets.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="px-4 py-16 text-center text-[#9BAABB] text-sm">
                      <div className="flex flex-col items-center gap-2">
                        <svg width="32" height="32" viewBox="0 0 32 32" fill="none" className="opacity-30">
                          <rect x="4" y="6" width="24" height="20" rx="2" stroke="#6B7A99" strokeWidth="2"/>
                          <path d="M10 12h12M10 17h8" stroke="#6B7A99" strokeWidth="2" strokeLinecap="round"/>
                        </svg>
                        No tickets found
                      </div>
                    </td>
                  </tr>
                ) : (
                  tickets.map((t) => {
                    const statusM = STATUS_META[t.status] ?? STATUS_META['open']
                    const priorityM = PRIORITY_META[t.priority] ?? PRIORITY_META['normal']
                    const categoryM = CATEGORY_META[t.category] ?? CATEGORY_META['other']
                    const domainM = DOMAIN_META[t.domain] ?? DOMAIN_META['other']
                    const isOverdue = t.sla_breach_at && new Date(t.sla_breach_at) < new Date()

                    return (
                      <tr
                        key={t.id}
                        className="hover:bg-[#F8F9FC] transition-colors duration-100 group"
                      >
                        <td className="px-4 py-3.5 font-mono">
                          {userProfile?.role === 'admin' || userProfile?.role === 'member' ? (
                            <a
                              href={`https://${process.env.NEXT_PUBLIC_ZENDESK_SUBDOMAIN ?? 'selfemployed-31120'}.zendesk.com/agent/tickets/${t.zendesk_id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 text-[#3B6EF0] hover:text-[#2a5cd4] font-medium text-xs transition-colors"
                            >
                              #{t.zendesk_id}
                              <svg width="9" height="9" viewBox="0 0 10 10" fill="none" className="opacity-50 group-hover:opacity-100 transition-opacity">
                                <path d="M1.5 8.5L8.5 1.5M8.5 1.5H3.5M8.5 1.5V6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                              </svg>
                            </a>
                          ) : (
                            <span className="text-[#9BAABB] text-xs">#{t.zendesk_id}</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5 max-w-[220px]">
                          <a
                            href={`/dashboard/tickets/${t.zendesk_id}`}
                            className="group/sub flex items-center gap-1.5 text-[#1E2A3B] hover:text-[#3B6EF0] transition-colors"
                          >
                            <span className="font-medium truncate group-hover/sub:underline underline-offset-2">{t.subject}</span>
                            <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="flex-shrink-0 opacity-0 group-hover/sub:opacity-100 transition-opacity text-[#3B6EF0]">
                              <path d="M1.5 8.5L8.5 1.5M8.5 1.5H3.5M8.5 1.5V6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          </a>
                        </td>

                        <td className="px-4 py-3.5">
                          <span className={`px-2 py-0.5 rounded-full border text-xs font-medium ${domainM.badge}`}>
                            {domainM.label}
                          </span>
                        </td>

                        <td className="px-4 py-3.5">
                          <span className={`px-2 py-0.5 rounded-full border text-xs font-medium capitalize ${categoryM.badge}`}>
                            {t.category}
                          </span>
                        </td>

                        <td className="px-4 py-3.5">
                          <div className="flex items-center gap-1.5">
                            <span className={`w-2 h-2 rounded-full flex-shrink-0 ${priorityM.color}`} />
                            <span className="text-xs text-[#6B7A99]">{priorityM.label}</span>
                          </div>
                        </td>

                        <td className="px-4 py-3.5">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${statusM.badge}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${statusM.dot}`} />
                            {statusM.label}
                          </span>
                        </td>

                        <td className="px-4 py-3.5 text-[#6B7A99] text-xs max-w-[120px] truncate">
                          {t.requester_name || t.requester_email}
                        </td>

                        <td className="px-4 py-3.5 text-[#6B7A99] text-xs">
                          {t.assignee_name || <span className="text-[#D1D9E6]">—</span>}
                        </td>

                        <td className="px-4 py-3.5 text-[#9BAABB] text-xs whitespace-nowrap">
                          {new Date(t.zendesk_created_at).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </td>

                        <td className="px-4 py-3.5">
                          {t.sla_breach_at ? (
                            <span className={`text-xs font-medium ${isOverdue ? 'text-red-500' : 'text-emerald-600'}`}>
                              {isOverdue ? '⚠ Breached' : '✓ On track'}
                            </span>
                          ) : (
                            <span className="text-[#D1D9E6]">—</span>
                          )}
                        </td>

                        <td className="px-4 py-3.5">
                          {t.csat_score ? (
                            <div className="flex items-center gap-1">
                              <span className="text-base leading-none">{CSAT_EMOJI[t.csat_score]}</span>
                              <span className="text-xs font-medium text-[#6B7A99]">{t.csat_score}/5</span>
                            </div>
                          ) : (
                            <span className="text-[#D1D9E6]">—</span>
                          )}
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between text-sm text-[#6B7A99] pb-2">
              <span className="text-xs">{totalCount} tickets total</span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="px-3.5 py-2 border border-[#E5E9F2] rounded-xl text-xs hover:bg-white hover:border-[#3B6EF0]/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
                >
                  ← Prev
                </button>
                <span className="px-3 py-2 text-xs font-medium">
                  {page} / {totalPages}
                </span>
                <button
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="px-3.5 py-2 border border-[#E5E9F2] rounded-xl text-xs hover:bg-white hover:border-[#3B6EF0]/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-150"
                >
                  Next →
                </button>
              </div>
            </div>
          )}

          {/* Live events toast strip */}
          {events.length > 0 && (
            <div className="fixed bottom-5 right-5 space-y-2 z-50">
              {events.slice(0, 3).map((e) => (
                <div
                  key={e.id}
                  className="flex items-center gap-2.5 bg-[#1A2038] text-white text-xs px-4 py-2.5 rounded-xl shadow-lg animate-slideIn"
                >
                  <span className={`w-2 h-2 rounded-full flex-shrink-0 ${e.type === 'INSERT' ? 'bg-emerald-400' : 'bg-blue-400'}`} />
                  <span className="text-white/60">{e.type === 'INSERT' ? 'New' : 'Updated'}</span>
                  <span className="font-medium truncate max-w-[180px]">{e.ticket.subject}</span>
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
