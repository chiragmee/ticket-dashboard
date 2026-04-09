export const dynamic = 'force-dynamic'

import TicketDashboard from './TicketDashboard'
import { createAdminClient } from '@/lib/supabase/admin'

async function getInitialData() {
  const supabase = createAdminClient()

  const [ticketsResult, totalResult, openResult, inProgressResult, resolvedResult, overdueResult, allCats] =
    await Promise.all([
      supabase.from('tickets').select('*').order('zendesk_updated_at', { ascending: false }).range(0, 19),
      supabase.from('tickets').select('*', { count: 'exact', head: true }),
      supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
      supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
      supabase.from('tickets').select('*', { count: 'exact', head: true }).in('status', ['resolved', 'closed']),
      supabase.from('tickets').select('*', { count: 'exact', head: true })
        .lt('sla_breach_at', new Date().toISOString())
        .not('status', 'in', '("resolved","closed")'),
      supabase.from('tickets').select('category'),
    ])

  const byCategory: Record<string, number> = { bug: 0, feature: 0, query: 0, enhancement: 0, other: 0 }
  for (const row of allCats.data ?? []) {
    const cat = row.category as string
    if (cat in byCategory) byCategory[cat]++
    else byCategory['other']++
  }

  const count = totalResult.count ?? 0

  return {
    tickets: { data: ticketsResult.data ?? [], count, totalPages: Math.ceil(count / 20) },
    summary: {
      total: count,
      open: openResult.count ?? 0,
      in_progress: inProgressResult.count ?? 0,
      resolved: resolvedResult.count ?? 0,
      overdue: overdueResult.count ?? 0,
      by_category: byCategory,
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
