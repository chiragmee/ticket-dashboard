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

  // All queries use HEAD (no row data returned — pure COUNT, very fast)
  const base = () => {
    const q = admin.from('tickets').select('*', { count: 'exact', head: true })
    return forceDomain ? q.eq('domain', forceDomain) : q
  }

  const [
    total, open, inProgress, resolved, overdue,
    bugCount, featureCount, queryCount,
    csatData,
  ] = await Promise.all([
    base(),
    base().eq('status', 'open'),
    base().eq('status', 'in_progress'),
    base().in('status', ['resolved', 'closed']),
    base().lt('sla_breach_at', new Date().toISOString()).not('status', 'in', '("resolved","closed")'),
    // Category counts — COUNT only, no row fetch
    base().eq('category', 'bug'),
    base().eq('category', 'feature'),
    base().eq('category', 'query'),
    // CSAT — only score values needed for avg
    admin.from('ticket_csat').select('score'),
  ])

  const totalCount  = total.count ?? 0
  const bugC        = bugCount.count ?? 0
  const featureC    = featureCount.count ?? 0
  const queryC      = queryCount.count ?? 0
  const byCategory  = {
    bug:     bugC,
    feature: featureC,
    query:   queryC,
    other:   Math.max(0, totalCount - bugC - featureC - queryC),
  }

  const csatScores = csatData.data ?? []
  const avg_csat   = csatScores.length
    ? Math.round((csatScores.reduce((sum, r) => sum + r.score, 0) / csatScores.length) * 10) / 10
    : null

  return NextResponse.json({
    total:       totalCount,
    open:        open.count ?? 0,
    in_progress: inProgress.count ?? 0,
    resolved:    resolved.count ?? 0,
    overdue:     overdue.count ?? 0,
    by_category: byCategory,
    avg_csat,
    csat_count:  csatScores.length,
  })
}
