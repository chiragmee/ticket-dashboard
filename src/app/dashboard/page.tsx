export const dynamic = 'force-dynamic'

import TicketDashboard from './TicketDashboard'
import { createAdminClient } from '@/lib/supabase/admin'

async function getInitialData() {
  const supabase = createAdminClient()

  const [ticketsResult, totalResult, openResult, inProgressResult, resolvedResult, overdueResult, allCats, csatData] =
    await Promise.all([
      supabase.from('tickets').select('*').order('zendesk_id', { ascending: false }).range(0, 19),
      supabase.from('tickets').select('*', { count: 'exact', head: true }),
      supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
      supabase.from('tickets').select('*', { count: 'exact', head: true }).in('status', ['resolved', 'closed']),
      supabase.from('tickets').select('*', { count: 'exact', head: true })
        .lt('sla_breach_at', new Date().toISOString())
        .not('status', 'in', '("resolved","closed")'),
      supabase.from('tickets').select('category'),
      supabase.from('ticket_csat').select('score'),
    ])

  const byCategory: Record<string, number> = { bug: 0, feature: 0, query: 0, other: 0 }
  for (const row of allCats.data ?? []) {
    const cat = row.category as string
    if (cat in byCategory) byCategory[cat]++
    else byCategory['other']++
  }

  const count = totalResult.count ?? 0
  const csatScores = csatData.data ?? []
  const avg_csat = csatScores.length
    ? Math.round((csatScores.reduce((sum: number, r: { score: number }) => sum + r.score, 0) / csatScores.length) * 10) / 10
    : null

  return {
    tickets: { data: ticketsResult.data ?? [], count, totalPages: Math.ceil(count / 20) },
    summary: {
      total: count,
      open: openResult.count ?? 0,
      in_progress: inProgressResult.count ?? 0,
      resolved: resolvedResult.count ?? 0,
      overdue: overdueResult.count ?? 0,
      by_category: byCategory,
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
