'use client'

import { useState, useEffect, useCallback } from 'react'
import DashboardShell from '@/components/DashboardShell'

type SyncLog = {
  id: number
  sync_type: string
  started_at: string
  completed_at: string | null
  tickets_processed: number
  status: string
  error_message: string
}

function SkeletonRow() {
  return (
    <tr className="border-b border-[#F1F3F9] animate-pulse">
      {[20, 32, 32, 12, 16, 24].map((w, i) => (
        <td key={i} className="px-4 py-4">
          <div className="h-3 bg-[#EEF0F5] rounded-full" style={{ width: `${w * 4}px` }} />
        </td>
      ))}
    </tr>
  )
}

export default function SyncPage() {
  const [logs, setLogs] = useState<SyncLog[]>([])
  const [loading, setLoading] = useState(true)
  const [syncing, setSyncing] = useState(false)
  const [result, setResult] = useState<{ synced?: number; error?: string } | null>(null)

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    const res = await fetch('/api/tickets/sync-logs')
    if (res.ok) {
      const json = await res.json()
      setLogs(json.data ?? [])
    }
    setLoading(false)
  }, [])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const runSync = async () => {
    setSyncing(true)
    setResult(null)
    const res = await fetch('/api/sync/trigger', { method: 'POST' })
    const json = await res.json()
    setResult(json)
    setSyncing(false)
    fetchLogs()
  }

  const lastSuccess = logs.find(l => l.status === 'success')

  return (
    <DashboardShell>
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-[#E5E9F2] px-6 py-3.5 flex items-center justify-between flex-shrink-0">
        <h1 className="text-base font-semibold text-[#1E2A3B]">Zendesk Sync</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* Sync card */}
        <div className="bg-white rounded-2xl border border-[#E5E9F2] p-5 shadow-sm flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-semibold text-[#1E2A3B]">Manual Sync</div>
            <div className="text-xs text-[#9BAABB] mt-1">
              {lastSuccess
                ? `Last synced ${new Date(lastSuccess.completed_at!).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })} — ${lastSuccess.tickets_processed} tickets`
                : 'Never synced'}
            </div>
          </div>
          <button
            onClick={runSync}
            disabled={syncing}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#3B6EF0] text-white rounded-xl text-sm font-semibold hover:bg-[#2a5cd4] disabled:opacity-50 transition-all shadow-sm shadow-[#3B6EF0]/25"
          >
            {syncing ? (
              <>
                <svg className="animate-spin" width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="6" stroke="white" strokeWidth="2" strokeDasharray="20" strokeDashoffset="10"/>
                </svg>
                Syncing…
              </>
            ) : (
              <>
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                  <path d="M13 3v4h-4M3 13v-4h4" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  <path d="M13 7A6 6 0 0 0 3.4 5M3 9a6 6 0 0 0 9.6 2" stroke="white" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                Sync from Zendesk
              </>
            )}
          </button>
        </div>

        {/* Result banner */}
        {result && (
          <div className={`rounded-2xl border px-5 py-3.5 text-sm font-medium flex items-center gap-2.5 ${
            result.error
              ? 'bg-red-50 border-red-200 text-red-700'
              : 'bg-emerald-50 border-emerald-200 text-emerald-700'
          }`}>
            {result.error
              ? <><span>✗</span> {result.error}</>
              : <><span>✓</span> Synced {result.synced} tickets successfully</>
            }
          </div>
        )}

        {/* Sync history table */}
        <div className="bg-white rounded-2xl border border-[#E5E9F2] overflow-hidden shadow-sm">
          <div className="px-5 py-4 border-b border-[#E5E9F2]">
            <h2 className="text-sm font-semibold text-[#1E2A3B]">Sync History</h2>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-[#F8F9FC] border-b border-[#E5E9F2]">
                {['Type', 'Started', 'Completed', 'Tickets', 'Status', 'Notes'].map(h => (
                  <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#9BAABB] uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F3F9]">
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => <SkeletonRow key={i} />)
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-[#9BAABB] text-sm">No sync history yet.</td>
                </tr>
              ) : (
                logs.map(log => (
                  <tr key={log.id} className="hover:bg-[#F8F9FC] transition-colors duration-100">
                    <td className="px-4 py-3.5 text-[#1E2A3B] font-medium capitalize">{log.sync_type}</td>
                    <td className="px-4 py-3.5 text-[#6B7A99] text-xs">
                      {new Date(log.started_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td className="px-4 py-3.5 text-[#6B7A99] text-xs">
                      {log.completed_at
                        ? new Date(log.completed_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })
                        : <span className="text-[#D1D9E6]">—</span>}
                    </td>
                    <td className="px-4 py-3.5 font-semibold text-[#1E2A3B]">{log.tickets_processed}</td>
                    <td className="px-4 py-3.5">
                      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium ${
                        log.status === 'success'
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : log.status === 'failed'
                          ? 'bg-red-50 text-red-700 border-red-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${
                          log.status === 'success' ? 'bg-emerald-500' : log.status === 'failed' ? 'bg-red-500' : 'bg-amber-500'
                        }`} />
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-red-500 text-xs max-w-[200px] truncate">
                      {log.error_message || <span className="text-[#D1D9E6]">—</span>}
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
