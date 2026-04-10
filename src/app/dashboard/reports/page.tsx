'use client'

import { useState, useCallback } from 'react'
import DashboardShell from '@/components/DashboardShell'

type ReportData = {
  total: number
  open: number
  pending: number
  in_progress: number
  resolved: number
  overdue: number
  sla_breached: number
  sla_on_track: number
  sla_compliance_pct: number
  by_category: Record<string, number>
  by_domain: Record<string, number>
  by_priority: Record<string, number>
  avg_csat: number | null
  csat_count: number
  date_from: string
  date_to: string
}

const STATUS_COLORS: Record<string, string> = {
  open: '#3B6EF0', pending: '#F59E0B', in_progress: '#8B5CF6', resolved: '#10B981', overdue: '#EF4444',
}
const CATEGORY_COLORS: Record<string, string> = {
  bug: '#EF4444', feature: '#3B6EF0', query: '#64748B', other: '#F59E0B',
}
const PRIORITY_COLORS: Record<string, string> = {
  urgent: '#EF4444', high: '#F97316', normal: '#3B6EF0', low: '#9CA3AF',
}

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E9F2] p-5 shadow-sm">
      <div className="text-xs font-semibold text-[#9BAABB] uppercase tracking-wider mb-2">{label}</div>
      <div className={`text-3xl font-bold tabular-nums ${color ?? 'text-[#1E2A3B]'}`}>{value}</div>
      {sub && <div className="text-xs text-[#9BAABB] mt-1">{sub}</div>}
    </div>
  )
}

function BarGroup({ title, data, colors }: { title: string; data: Record<string, number>; colors: Record<string, string> }) {
  const total = Object.values(data).reduce((s, v) => s + v, 0) || 1
  return (
    <div className="bg-white rounded-2xl border border-[#E5E9F2] p-5 shadow-sm">
      <h3 className="text-sm font-semibold text-[#1E2A3B] mb-4">{title}</h3>
      <div className="space-y-3">
        {Object.entries(data).map(([key, count]) => (
          <div key={key}>
            <div className="flex justify-between text-xs mb-1">
              <span className="capitalize font-medium text-[#1E2A3B]">{key.replace('_', ' ')}</span>
              <span className="text-[#6B7A99] tabular-nums">{count} ({Math.round((count / total) * 100)}%)</span>
            </div>
            <div className="h-2 bg-[#F1F3F9] rounded-full overflow-hidden">
              <div
                className="h-full rounded-full"
                style={{ width: `${(count / total) * 100}%`, backgroundColor: colors[key] ?? '#9CA3AF' }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ReportsPage() {
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [domain, setDomain] = useState('')
  const [report, setReport] = useState<ReportData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [exporting, setExporting] = useState(false)

  const canGenerate = dateFrom && dateTo

  const generate = useCallback(async () => {
    if (!canGenerate) return
    setLoading(true)
    setError('')
    const params = new URLSearchParams({ date_from: dateFrom, date_to: dateTo })
    if (domain) params.set('domain', domain)
    const res = await fetch(`/api/reports/summary?${params}`)
    if (!res.ok) { setError('Failed to generate report'); setLoading(false); return }
    const json = await res.json()
    setReport(json)
    setLoading(false)
  }, [dateFrom, dateTo, domain, canGenerate])

  const handleExportCSV = useCallback(async () => {
    if (!report) return
    setExporting(true)
    const params = new URLSearchParams({ date_from: report.date_from, date_to: report.date_to })
    if (domain) params.set('domain', domain)
    const res = await fetch(`/api/tickets/export?${params}`)
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `report-${report.date_from}-to-${report.date_to}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setExporting(false)
  }, [report, domain])

  const handleExportPDF = useCallback(() => {
    window.print()
  }, [])

  return (
    <DashboardShell>
      {/* Print styles — only active during window.print() */}
      <style dangerouslySetInnerHTML={{ __html: `
        @media print {
          @page { margin: 1.2cm; size: A4; }
          aside, .no-print { display: none !important; }
          body { background: white !important; }
          .print-area { padding: 0 !important; }
          .print-area .animate-fadeInUp { animation: none !important; }
          * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        }
      `}} />

      <div className="p-6 space-y-6 animate-fadeInUp print-area">

        {/* Header */}
        <div className="flex items-center justify-between no-print">
          <div>
            <h1 className="text-lg font-bold text-[#1E2A3B]">Reports</h1>
            <p className="text-sm text-[#9BAABB] mt-0.5">Generate a summary for any date range</p>
          </div>
          {report && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleExportCSV}
                disabled={exporting}
                className="flex items-center gap-2 px-4 py-2 bg-white border border-[#E5E9F2] text-[#1E2A3B] text-sm font-medium rounded-xl hover:border-[#3B6EF0]/40 hover:text-[#3B6EF0] disabled:opacity-50 transition-all shadow-sm"
              >
                {exporting ? (
                  <svg className="animate-spin" width="14" height="14" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="currentColor" strokeWidth="2" strokeDasharray="20 10"/></svg>
                ) : (
                  <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M8 2v8M5 7l3 3 3-3M3 11v1a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2v-1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
                )}
                {exporting ? 'Exporting…' : 'Download CSV'}
              </button>
              <button
                onClick={handleExportPDF}
                className="flex items-center gap-2 px-4 py-2 bg-[#3B6EF0] text-white text-sm font-medium rounded-xl hover:bg-[#2a5cd4] transition-all shadow-sm shadow-[#3B6EF0]/25"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 1h7l3 3v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1Z" stroke="white" strokeWidth="1.4" strokeLinejoin="round"/><path d="M10 1v3h3M5 9h6M5 11.5h4" stroke="white" strokeWidth="1.4" strokeLinecap="round"/></svg>
                Download PDF
              </button>
            </div>
          )}
        </div>

        {/* Print header — only visible during print */}
        {report && (
          <div className="hidden print:block mb-2">
            <h1 className="text-xl font-bold text-[#1E2A3B]">TicketView — Report</h1>
            <p className="text-sm text-[#6B7A99] mt-0.5">
              {new Date(report.date_from).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              {' → '}
              {new Date(report.date_to).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              {domain && ` · ${domain.toUpperCase()}`}
            </p>
          </div>
        )}

        {/* Filters */}
        <div className="bg-white rounded-2xl border border-[#E5E9F2] p-4 shadow-sm no-print">
          <div className="flex items-center gap-2 flex-wrap">
            {/* From */}
            <div className="flex items-center gap-2 border border-[#E5E9F2] rounded-xl px-3 py-2.5 bg-[#F8F9FC] focus-within:border-[#3B6EF0] focus-within:ring-2 focus-within:ring-[#3B6EF0]/10 transition-all">
              <span className="text-xs font-bold text-[#9BAABB] uppercase tracking-wider select-none">From</span>
              <input
                type="date"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="text-sm text-[#1E2A3B] bg-transparent focus:outline-none w-32"
              />
            </div>

            <span className="text-[#D1D9E6] text-sm select-none">→</span>

            {/* To */}
            <div className="flex items-center gap-2 border border-[#E5E9F2] rounded-xl px-3 py-2.5 bg-[#F8F9FC] focus-within:border-[#3B6EF0] focus-within:ring-2 focus-within:ring-[#3B6EF0]/10 transition-all">
              <span className="text-xs font-bold text-[#9BAABB] uppercase tracking-wider select-none">To</span>
              <input
                type="date"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="text-sm text-[#1E2A3B] bg-transparent focus:outline-none w-32"
              />
            </div>

            {/* Domain */}
            <div className="flex items-center gap-2 border border-[#E5E9F2] rounded-xl px-3 py-2.5 bg-[#F8F9FC] focus-within:border-[#3B6EF0] transition-all">
              <span className="text-xs font-bold text-[#9BAABB] uppercase tracking-wider select-none">Domain</span>
              <select
                value={domain}
                onChange={(e) => setDomain(e.target.value)}
                className="text-sm text-[#1E2A3B] bg-transparent focus:outline-none cursor-pointer pr-1"
              >
                <option value="">All</option>
                <option value="krt">KRT</option>
                <option value="brigade">Brigade</option>
                <option value="acb">ACB</option>
                <option value="other">Other</option>
              </select>
            </div>

            <button
              onClick={generate}
              disabled={!canGenerate || loading}
              className="px-5 py-2.5 bg-[#3B6EF0] text-white text-sm font-medium rounded-xl hover:bg-[#2a5cd4] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shadow-[#3B6EF0]/25"
            >
              {loading ? 'Generating…' : 'Generate Report'}
            </button>
          </div>
          {!canGenerate && (
            <p className="text-xs text-[#9BAABB] mt-3">Select both a start and end date to generate a report.</p>
          )}
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700 no-print">{error}</div>
        )}

        {/* Skeleton */}
        {loading && (
          <div className="space-y-4 animate-pulse no-print">
            <div className="grid grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-[#E5E9F2] p-5 h-24">
                  <div className="h-3 bg-[#EEF0F5] rounded-full w-20 mb-3" />
                  <div className="h-8 bg-[#EEF0F5] rounded-full w-16" />
                </div>
              ))}
            </div>
            <div className="grid grid-cols-3 gap-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="bg-white rounded-2xl border border-[#E5E9F2] p-5 h-48">
                  <div className="h-3 bg-[#EEF0F5] rounded-full w-24 mb-4" />
                  {[...Array(4)].map((_, j) => (
                    <div key={j} className="h-2 bg-[#EEF0F5] rounded-full mb-3" />
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Report results */}
        {report && !loading && (
          <div className="space-y-4 animate-fadeInUp">

            {/* Period banner */}
            <div className="flex items-center gap-2 text-sm text-[#6B7A99] no-print">
              <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><rect x="1" y="2" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.3"/><path d="M5 1v2M11 1v2M1 6h14" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round"/></svg>
              <span>
                {new Date(report.date_from).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                {' → '}
                {new Date(report.date_to).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                {domain && <span className="ml-2 px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-medium capitalize">{domain}</span>}
              </span>
            </div>

            {/* KPI row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Total Tickets" value={report.total} />
              <StatCard label="Open" value={report.open} color="text-blue-600" />
              <StatCard label="Resolved" value={report.resolved} color="text-emerald-600" />
              <StatCard label="Overdue" value={report.overdue} color="text-red-500" />
            </div>

            {/* Status breakdown row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <StatCard label="Pending" value={report.pending} color="text-amber-500" />
              <StatCard label="In Progress" value={report.in_progress} color="text-violet-600" />
              <StatCard label="SLA Breached" value={report.sla_breached} color="text-red-500" />
              <StatCard label="SLA On Track" value={report.sla_on_track} color="text-emerald-600" />
            </div>

            {/* SLA + CSAT row */}
            <div className="grid grid-cols-2 gap-4">
              <StatCard
                label="SLA Compliance"
                value={`${report.sla_compliance_pct}%`}
                sub={`${report.sla_on_track} on track · ${report.sla_breached} breached`}
                color={report.sla_compliance_pct >= 80 ? 'text-emerald-600' : report.sla_compliance_pct >= 60 ? 'text-amber-600' : 'text-red-500'}
              />
              <StatCard
                label="Avg CSAT"
                value={report.avg_csat !== null ? `${report.avg_csat} / 5` : '—'}
                sub={`${report.csat_count} ${report.csat_count === 1 ? 'response' : 'responses'}`}
                color={report.avg_csat !== null && report.avg_csat >= 4 ? 'text-emerald-600' : report.avg_csat !== null && report.avg_csat >= 3 ? 'text-amber-600' : 'text-[#1E2A3B]'}
              />
            </div>

            {/* Breakdown charts */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <BarGroup title="By Category" data={report.by_category} colors={CATEGORY_COLORS} />
              <BarGroup title="By Status" data={{ open: report.open, pending: report.pending, in_progress: report.in_progress, resolved: report.resolved, overdue: report.overdue }} colors={STATUS_COLORS} />
              <BarGroup title="By Priority" data={report.by_priority} colors={PRIORITY_COLORS} />
            </div>

            {/* Domain breakdown (if showing all) */}
            {!domain && Object.keys(report.by_domain).length > 0 && (
              <BarGroup
                title="By Domain"
                data={report.by_domain}
                colors={{ krt: '#6366F1', brigade: '#F97316', acb: '#14B8A6', other: '#9CA3AF' }}
              />
            )}
          </div>
        )}

      </div>
    </DashboardShell>
  )
}
