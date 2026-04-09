'use client'

import { useState, useEffect, useCallback } from 'react'

type SyncLog = {
  id: number
  sync_type: string
  started_at: string
  completed_at: string | null
  tickets_processed: number
  status: string
  error_message: string
}

export default function SyncPage() {
  const [logs, setLogs] = useState<SyncLog[]>([])
  const [loading, setLoading] = useState(false)
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
    const res = await fetch('/api/sync/zendesk', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`,
      },
    })
    const json = await res.json()
    setResult(json)
    setSyncing(false)
    fetchLogs()
  }

  const lastSuccess = logs.find((l) => l.status === 'success')

  return (
    <div className="min-h-screen bg-[#F4F6FB] p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-[#1E2A3B]">Zendesk Sync</h1>
          <p className="text-sm text-[#6B7A99] mt-1">Manually pull latest tickets from Zendesk</p>
        </div>

        <div className="bg-white rounded-xl border border-[#E5E9F2] p-6 flex items-center justify-between">
          <div>
            <div className="text-sm font-medium text-[#1E2A3B]">Last successful sync</div>
            <div className="text-sm text-[#6B7A99] mt-1">
              {lastSuccess
                ? `${new Date(lastSuccess.completed_at!).toLocaleString()} — ${lastSuccess.tickets_processed} tickets`
                : 'Never synced'}
            </div>
          </div>
          <button
            onClick={runSync}
            disabled={syncing}
            className="px-5 py-2 bg-[#3B6EF0] text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
          >
            {syncing ? 'Syncing...' : 'Sync from Zendesk'}
          </button>
        </div>

        {result && (
          <div
            className={`rounded-xl border p-4 text-sm ${
              result.error
                ? 'bg-red-50 border-red-200 text-red-700'
                : 'bg-green-50 border-green-200 text-green-700'
            }`}
          >
            {result.error ? `Error: ${result.error}` : `Synced ${result.synced} tickets successfully.`}
          </div>
        )}

        <div className="bg-white rounded-xl border border-[#E5E9F2] overflow-hidden">
          <div className="px-5 py-4 border-b border-[#E5E9F2]">
            <h2 className="text-sm font-semibold text-[#1E2A3B]">Sync History</h2>
          </div>
          {loading ? (
            <div className="p-8 text-center text-[#6B7A99] text-sm">Loading...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-[#6B7A99] text-sm">No sync history yet.</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-[#F4F6FB]">
                <tr>
                  {['Type', 'Started', 'Completed', 'Tickets', 'Status', 'Error'].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-[#6B7A99] uppercase">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E5E9F2]">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#F4F6FB]">
                    <td className="px-4 py-3 text-[#1E2A3B] capitalize">{log.sync_type}</td>
                    <td className="px-4 py-3 text-[#6B7A99]">{new Date(log.started_at).toLocaleString()}</td>
                    <td className="px-4 py-3 text-[#6B7A99]">
                      {log.completed_at ? new Date(log.completed_at).toLocaleString() : '—'}
                    </td>
                    <td className="px-4 py-3 text-[#1E2A3B]">{log.tickets_processed}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-xs font-medium ${
                          log.status === 'success'
                            ? 'bg-green-100 text-green-700'
                            : log.status === 'failed'
                            ? 'bg-red-100 text-red-700'
                            : 'bg-yellow-100 text-yellow-700'
                        }`}
                      >
                        {log.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-red-500 text-xs max-w-[200px] truncate">
                      {log.error_message || '—'}
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
