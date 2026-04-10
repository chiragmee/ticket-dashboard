import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  // Get current user's profile for domain-scoped access
  const supabaseUser = await createClient()
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('role, domain_access')
    .eq('user_id', user.id)
    .single()

  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const category = searchParams.get('category')
  const domain = searchParams.get('domain')
  const search = searchParams.get('search')
  const org = searchParams.get('org')
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20')))
  const offset = (page - 1) * pageSize

  let query = admin.from('tickets').select('*', { count: 'exact' })

  // Non-admin users only see their domain's tickets
  const isAdmin = profile?.role === 'admin'
  const userDomain = profile?.domain_access
  if (!isAdmin && userDomain && userDomain !== 'all') {
    query = query.eq('domain', userDomain)
  } else if (domain) {
    query = query.eq('domain', domain)
  }

  if (status) query = query.eq('status', status)
  if (category) query = query.eq('category', category)
  if (org) query = query.eq('requester_org', org)
  const assignee = searchParams.get('assignee')
  if (assignee) query = query.eq('assignee_name', assignee)
  if (search) {
    query = query.or(
      `subject.ilike.%${search}%,requester_name.ilike.%${search}%,requester_email.ilike.%${search}%`
    )
  }

  const dateFrom = searchParams.get('date_from')
  const dateTo = searchParams.get('date_to')
  if (dateFrom) query = query.gte('zendesk_created_at', new Date(dateFrom).toISOString())
  if (dateTo) {
    const end = new Date(dateTo)
    end.setHours(23, 59, 59, 999)
    query = query.lte('zendesk_created_at', end.toISOString())
  }

  query = query
    .order('zendesk_id', { ascending: false })
    .range(offset, offset + pageSize - 1)

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Fetch CSAT scores for this page of tickets
  let csatMap: Record<number, number> = {}
  if (data && data.length > 0) {
    const ids = data.map((t: { zendesk_id: number }) => t.zendesk_id)
    const { data: csatRows } = await admin
      .from('ticket_csat')
      .select('zendesk_id, score')
      .in('zendesk_id', ids)
    csatMap = Object.fromEntries((csatRows ?? []).map((r: { zendesk_id: number; score: number }) => [r.zendesk_id, r.score]))
  }

  return NextResponse.json({
    data: (data ?? []).map((t: { zendesk_id: number }) => ({ ...t, csat_score: csatMap[t.zendesk_id] ?? null })),
    count: count ?? 0,
    page,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  })
}
