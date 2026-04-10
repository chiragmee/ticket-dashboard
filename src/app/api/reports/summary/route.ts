import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const supabaseUser = await createClient()
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('role, domain_access')
    .eq('user_id', user.id)
    .single()

  const searchParams = req.nextUrl.searchParams
  const dateFrom = searchParams.get('date_from')
  const dateTo   = searchParams.get('date_to')
  const domain   = searchParams.get('domain')

  if (!dateFrom || !dateTo) {
    return NextResponse.json({ error: 'date_from and date_to are required' }, { status: 400 })
  }

  const fromISO = new Date(dateFrom).toISOString()
  const toDate  = new Date(dateTo)
  toDate.setHours(23, 59, 59, 999)
  const toISO = toDate.toISOString()

  const isAdmin    = profile?.role === 'admin'
  const userDomain = profile?.domain_access
  const forceDomain = !isAdmin && userDomain && userDomain !== 'all'
    ? userDomain
    : (domain || null)

  const base = () => {
    let q = admin
      .from('tickets')
      .select('*', { count: 'exact', head: true })
      .gte('zendesk_created_at', fromISO)
      .lte('zendesk_created_at', toISO)
    if (forceDomain) q = q.eq('domain', forceDomain)
    return q
  }

  // Parallel COUNT queries
  const [
    total, open, pending, inProgress, resolved, overdue,
    bugCount, featureCount, queryCount,
    slaBreached,
    // Domain counts (only if not scoped to a single domain)
    krtCount, brigadeCount, acbCount, otherDomainCount,
    // Priority counts
    urgentCount, highCount, normalCount, lowCount,
  ] = await Promise.all([
    base(),
    base().eq('status', 'open'),
    base().eq('status', 'pending'),
    base().eq('status', 'in_progress'),
    base().in('status', ['resolved', 'closed']),
    base().lt('sla_breach_at', new Date().toISOString()).not('status', 'in', '("resolved","closed")'),
    base().eq('category', 'bug'),
    base().eq('category', 'feature'),
    base().eq('category', 'query'),
    // SLA breached: sla_breach_at is set and < now
    admin.from('tickets')
      .select('*', { count: 'exact', head: true })
      .gte('zendesk_created_at', fromISO)
      .lte('zendesk_created_at', toISO)
      .not('sla_breach_at', 'is', null)
      .lt('sla_breach_at', new Date().toISOString()),
    // Domain counts
    base().eq('domain', 'krt'),
    base().eq('domain', 'brigade'),
    base().eq('domain', 'acb'),
    base().eq('domain', 'other'),
    // Priority counts
    base().eq('priority', 'urgent'),
    base().eq('priority', 'high'),
    base().eq('priority', 'normal'),
    base().eq('priority', 'low'),
  ])

  // CSAT for this period — need to join via ticket IDs in range
  // Get ticket IDs in range first, then get CSAT for those
  let cqBase = admin
    .from('tickets')
    .select('zendesk_id')
    .gte('zendesk_created_at', fromISO)
    .lte('zendesk_created_at', toISO)
  if (forceDomain) cqBase = cqBase.eq('domain', forceDomain)
  const { data: ticketIds } = await cqBase

  const ids = (ticketIds ?? []).map((t: { zendesk_id: number }) => t.zendesk_id)
  let avg_csat: number | null = null
  let csat_count = 0
  if (ids.length > 0) {
    const { data: csatRows } = await admin
      .from('ticket_csat')
      .select('score')
      .in('zendesk_id', ids)
    if (csatRows && csatRows.length > 0) {
      csat_count = csatRows.length
      avg_csat = Math.round(
        (csatRows.reduce((s: number, r: { score: number }) => s + r.score, 0) / csat_count) * 10
      ) / 10
    }
  }

  const totalCount     = total.count ?? 0
  const slaBreachedCount = slaBreached.count ?? 0
  const slaOnTrack     = Math.max(0, totalCount - slaBreachedCount)
  const slaCompliancePct = totalCount > 0
    ? Math.round((slaOnTrack / totalCount) * 100)
    : 100

  const bugC     = bugCount.count ?? 0
  const featureC = featureCount.count ?? 0
  const queryC   = queryCount.count ?? 0
  const otherC   = Math.max(0, totalCount - bugC - featureC - queryC)

  return NextResponse.json({
    total:               totalCount,
    open:                open.count ?? 0,
    pending:             pending.count ?? 0,
    in_progress:         inProgress.count ?? 0,
    resolved:            resolved.count ?? 0,
    overdue:             overdue.count ?? 0,
    sla_breached:        slaBreachedCount,
    sla_on_track:        slaOnTrack,
    sla_compliance_pct:  slaCompliancePct,
    by_category:         { bug: bugC, feature: featureC, query: queryC, other: otherC },
    by_domain:           forceDomain ? {} : {
      krt:     krtCount.count ?? 0,
      brigade: brigadeCount.count ?? 0,
      acb:     acbCount.count ?? 0,
      other:   otherDomainCount.count ?? 0,
    },
    by_priority: {
      urgent: urgentCount.count ?? 0,
      high:   highCount.count ?? 0,
      normal: normalCount.count ?? 0,
      low:    lowCount.count ?? 0,
    },
    avg_csat,
    csat_count,
    date_from: dateFrom,
    date_to:   dateTo,
  })
}
