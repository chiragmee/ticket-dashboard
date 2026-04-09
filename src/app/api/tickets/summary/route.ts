import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = createAdminClient()

  const [total, open, inProgress, resolved, overdue, allTickets] = await Promise.all([
    supabase.from('tickets').select('*', { count: 'exact', head: true }),
    supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'open'),
    supabase.from('tickets').select('*', { count: 'exact', head: true }).eq('status', 'in_progress'),
    supabase.from('tickets').select('*', { count: 'exact', head: true }).in('status', ['resolved', 'closed']),
    supabase
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .lt('sla_breach_at', new Date().toISOString())
      .not('status', 'in', '("resolved","closed")'),
    supabase.from('tickets').select('category'),
  ])

  const byCategory: Record<string, number> = {
    bug: 0,
    feature: 0,
    query: 0,
    enhancement: 0,
    other: 0,
  }

  for (const row of allTickets.data ?? []) {
    const cat = row.category as string
    if (cat in byCategory) byCategory[cat]++
    else byCategory['other']++
  }

  return NextResponse.json({
    total: total.count ?? 0,
    open: open.count ?? 0,
    in_progress: inProgress.count ?? 0,
    resolved: resolved.count ?? 0,
    overdue: overdue.count ?? 0,
    by_category: byCategory,
  })
}
