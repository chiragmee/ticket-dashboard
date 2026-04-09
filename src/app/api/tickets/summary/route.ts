import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabaseUser = await createClient()
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('role, domain_access')
    .eq('user_id', user.id)
    .single()

  const isAdmin = profile?.role === 'admin'
  const userDomain = profile?.domain_access
  const forceDomain = !isAdmin && userDomain && userDomain !== 'all' ? userDomain : null

  const base = () => {
    const q = admin.from('tickets')
    return forceDomain ? q.select('*', { count: 'exact', head: true }).eq('domain', forceDomain) : q.select('*', { count: 'exact', head: true })
  }

  const categoryQuery = forceDomain
    ? admin.from('tickets').select('category').eq('domain', forceDomain)
    : admin.from('tickets').select('category')

  const [total, open, inProgress, resolved, overdue, allTickets, csatData] = await Promise.all([
    base(),
    base().eq('status', 'open'),
    base().eq('status', 'in_progress'),
    base().in('status', ['resolved', 'closed']),
    base().lt('sla_breach_at', new Date().toISOString()).not('status', 'in', '("resolved","closed")'),
    categoryQuery,
    admin.from('ticket_csat').select('score'),
  ])

  const byCategory: Record<string, number> = { bug: 0, feature: 0, query: 0, other: 0 }
  for (const row of allTickets.data ?? []) {
    const cat = row.category as string
    if (cat in byCategory) byCategory[cat]++
    else byCategory['other']++
  }

  const csatScores = csatData.data ?? []
  const avg_csat = csatScores.length
    ? Math.round((csatScores.reduce((sum, r) => sum + r.score, 0) / csatScores.length) * 10) / 10
    : null

  return NextResponse.json({
    total: total.count ?? 0,
    open: open.count ?? 0,
    in_progress: inProgress.count ?? 0,
    resolved: resolved.count ?? 0,
    overdue: overdue.count ?? 0,
    by_category: byCategory,
    avg_csat,
    csat_count: csatScores.length,
  })
}
