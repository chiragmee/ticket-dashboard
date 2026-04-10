export const dynamic = 'force-dynamic'

import TicketDashboard from './TicketDashboard'
import { createAdminClient } from '@/lib/supabase/admin'

async function getInitialData() {
  const supabase = createAdminClient()

  const base = () => supabase.from('tickets').select('*', { count: 'exact', head: true })

  const [
    ticketsResult,
    total, open, inProgress, resolved, overdue,
    bugCount, featureCount, queryCount,
    csatData,
  ] = await Promise.all([
    supabase.from('tickets').select('*').order('zendesk_id', { ascending: false }).range(0, 9),
    base(),
    base().eq('status', 'open'),
    base().eq('status', 'in_progress'),
    base().in('status', ['resolved', 'closed']),
    base().lt('sla_breach_at', new Date().toISOString()).not('status', 'in', '("resolved","closed")'),
    base().eq('category', 'bug'),
    base().eq('category', 'feature'),
    base().eq('category', 'query'),
    supabase.from('ticket_csat').select('score'),
  ])

  const totalCount = total.count ?? 0
  const bugC       = bugCount.count ?? 0
  const featureC   = featureCount.count ?? 0
  const queryC     = queryCount.count ?? 0

  const csatScores = csatData.data ?? []
  const avg_csat   = csatScores.length
    ? Math.round((csatScores.reduce((sum: number, r: { score: number }) => sum + r.score, 0) / csatScores.length) * 10) / 10
    : null

  return {
    tickets: {
      data: ticketsResult.data ?? [],
      count: totalCount,
      totalPages: Math.ceil(totalCount / 10),
    },
    summary: {
      total:       totalCount,
      open:        open.count ?? 0,
      in_progress: inProgress.count ?? 0,
      resolved:    resolved.count ?? 0,
      overdue:     overdue.count ?? 0,
      by_category: {
        bug:     bugC,
        feature: featureC,
        query:   queryC,
        other:   Math.max(0, totalCount - bugC - featureC - queryC),
      },
      avg_csat,
      csat_count: csatScores.length,
    },
  }
}

export default async function DashboardPage() {
  const { tickets, summary } = await getInitialData()
  return (
    <TicketDashboard
      initialTickets={tickets.data ?? []}
      initialSummary={summary}
      initialCount={tickets.count ?? 0}
    />
  )
}
