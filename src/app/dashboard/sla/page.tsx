'use client'

import { useState, useEffect } from 'react'
import DashboardShell from '@/components/DashboardShell'

type SlaRow = { priority: string; hours: number }

const PRIORITY_META: Record<string, { label: string; color: string; dot: string; description: string }> = {
  urgent: { label: 'Urgent', color: 'text-red-600', dot: 'bg-red-500', description: 'Critical issues causing full system outage or data loss' },
  high:   { label: 'High',   color: 'text-orange-600', dot: 'bg-orange-400', description: 'Major functionality broken, significant business impact' },
  normal: { label: 'Normal', color: 'text-blue-600',   dot: 'bg-blue-400',   description: 'Standard issues and requests with moderate impact' },
  low:    { label: 'Low',    color: 'text-gray-500',   dot: 'bg-gray-300',   description: 'Minor issues, cosmetic problems, general queries' },
}

const PRIORITY_ORDER = ['urgent', 'high', 'normal', 'low']

function formatHours(h: number) {
  if (h < 24) return `${h}h`
  const days = Math.floor(h / 24)
  const rem  = h % 24
  return rem > 0 ? `${days}d ${rem}h` : `${days}d`
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-[#E5E9F2] p-5 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-3 h-3 rounded-full bg-[#EEF0F5]" />
          <div>
            <div className="h-3.5 bg-[#EEF0F5] rounded w-16 mb-2" />
            <div className="h-3 bg-[#EEF0F5] rounded w-56" />
          </div>
        </div>
        <div className="h-9 bg-[#EEF0F5] rounded-xl w-36" />
      </div>
    </div>
  )
}

export default function SlaConfigPage() {
  const [config, setConfig] = useState<SlaRow[]>([])
  const [draft, setDraft] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    fetch('/api/sla/config').then(r => r.json()).then(json => {
      const rows: SlaRow[] = json.config ?? []
      setConfig(rows)
      setDraft(Object.fromEntries(rows.map(r => [r.priority, r.hours])))
      setLoading(false)
    })
  }, [])

  const isDirty = config.some(r => draft[r.priority] !== r.hours)

  const handleSave = async () => {
    setSaving(true)
    setError('')
    const updates = config.map(r => ({ priority: r.priority, hours: draft[r.priority] }))
    const res = await fetch('/api/sla/config', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates }),
    })
    if (res.ok) {
      setConfig(updates)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } else {
      const json = await res.json()
      setError(json.error ?? 'Failed to save')
    }
    setSaving(false)
  }

  const sorted = [...config].sort((a, b) => PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority))

  return (
    <DashboardShell>
      {/* Header */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-[#E5E9F2] px-6 py-3.5 flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-base font-semibold text-[#1E2A3B]">SLA Configuration</h1>
          <p className="text-xs text-[#9BAABB] mt-0.5">Set resolution time targets per priority level</p>
        </div>
        <button
          onClick={handleSave}
          disabled={saving || !isDirty}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#3B6EF0] text-white text-sm font-semibold rounded-xl hover:bg-[#2a5cd4] disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm shadow-[#3B6EF0]/25"
        >
          {saving ? 'Saving…' : saved ? '✓ Saved' : 'Save Changes'}
        </button>
      </header>

      <div className="flex-1 overflow-y-auto p-6 space-y-4">

        {/* Priority cards */}
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          sorted.map(row => {
            const meta = PRIORITY_META[row.priority]
            const val  = draft[row.priority] ?? row.hours
            const barPct = Math.min(100, (val / 96) * 100)
            const barColor = row.priority === 'urgent' ? 'bg-red-400' : row.priority === 'high' ? 'bg-orange-400' : row.priority === 'normal' ? 'bg-blue-400' : 'bg-gray-300'

            return (
              <div key={row.priority} className="bg-white rounded-2xl border border-[#E5E9F2] p-5 shadow-sm">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <span className={`w-3 h-3 rounded-full flex-shrink-0 ${meta?.dot}`} />
                    <div className="min-w-0">
                      <div className={`text-sm font-semibold ${meta?.color}`}>{meta?.label}</div>
                      <div className="text-xs text-[#9BAABB] mt-0.5 truncate">{meta?.description}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 flex-shrink-0">
                    <div className="flex items-center border border-[#E5E9F2] rounded-xl overflow-hidden shadow-sm">
                      <button
                        onClick={() => setDraft(d => ({ ...d, [row.priority]: Math.max(1, (d[row.priority] ?? row.hours) - 1) }))}
                        className="w-9 h-9 flex items-center justify-center text-[#6B7A99] hover:bg-[#F4F6FB] transition-colors font-bold"
                      >−</button>
                      <input
                        type="number"
                        min={1}
                        value={val}
                        onChange={e => {
                          const n = parseInt(e.target.value)
                          if (!isNaN(n) && n >= 1) setDraft(d => ({ ...d, [row.priority]: n }))
                        }}
                        className="w-14 text-center text-sm font-bold text-[#1E2A3B] border-x border-[#E5E9F2] h-9 focus:outline-none"
                      />
                      <button
                        onClick={() => setDraft(d => ({ ...d, [row.priority]: (d[row.priority] ?? row.hours) + 1 }))}
                        className="w-9 h-9 flex items-center justify-center text-[#6B7A99] hover:bg-[#F4F6FB] transition-colors font-bold"
                      >+</button>
                    </div>
                    <span className="text-xs text-[#9BAABB] w-8">hrs</span>
                    <span className="text-sm font-semibold text-[#3B6EF0] w-12 text-right">{formatHours(val)}</span>
                  </div>
                </div>

                <div className="mt-4 ml-6">
                  <div className="h-1.5 bg-[#F1F3F9] rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-300 ${barColor}`} style={{ width: `${barPct}%` }} />
                  </div>
                </div>
              </div>
            )
          })
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}

        {!loading && (
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-xs text-blue-700 leading-relaxed">
            <strong>How it works:</strong> When a new ticket arrives, AI classifies its priority (urgent/high/normal/low) based on the subject and description. The SLA deadline is then calculated from these hours. Breach alerts are sent to your configured <strong>SLA_ALERT_EMAIL</strong> once daily via cron.
          </div>
        )}

      </div>
    </DashboardShell>
  )
}
