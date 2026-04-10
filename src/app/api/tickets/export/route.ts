import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

function escapeCSV(val: unknown): string {
  if (val === null || val === undefined) return ''
  const s = String(val)
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

function toRow(fields: unknown[]): string {
  return fields.map(escapeCSV).join(',')
}

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

  const { searchParams } = new URL(req.url)
  const status   = searchParams.get('status')
  const category = searchParams.get('category')
  const domain   = searchParams.get('domain')
  const search   = searchParams.get('search')
  const org      = searchParams.get('org')
  const assignee = searchParams.get('assignee')
  const dateFrom = searchParams.get('date_from')
  const dateTo   = searchParams.get('date_to')

  const isAdmin   = profile?.role === 'admin'
  const userDomain = profile?.domain_access

  let query = admin.from('tickets').select('*').order('zendesk_id', { ascending: false })

  if (!isAdmin && userDomain && userDomain !== 'all') {
    query = query.eq('domain', userDomain)
  } else if (domain) {
    query = query.eq('domain', domain)
  }

  if (status)   query = query.eq('status', status)
  if (category) query = query.eq('category', category)
  if (org)      query = query.eq('requester_org', org)
  if (assignee) query = query.eq('assignee_name', assignee)
  if (search) {
    query = query.or(
      `subject.ilike.%${search}%,requester_name.ilike.%${search}%,requester_email.ilike.%${search}%`
    )
  }
  if (dateFrom) query = query.gte('zendesk_created_at', new Date(dateFrom).toISOString())
  if (dateTo) {
    const end = new Date(dateTo)
    end.setHours(23, 59, 59, 999)
    query = query.lte('zendesk_created_at', end.toISOString())
  }

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Fetch CSAT for all returned tickets
  const ids = (data ?? []).map((t: { zendesk_id: number }) => t.zendesk_id)
  let csatMap: Record<number, number> = {}
  if (ids.length > 0) {
    const { data: csatRows } = await admin
      .from('ticket_csat')
      .select('zendesk_id, score')
      .in('zendesk_id', ids)
    csatMap = Object.fromEntries(
      (csatRows ?? []).map((r: { zendesk_id: number; score: number }) => [r.zendesk_id, r.score])
    )
  }

  const header = toRow([
    'ID', 'Subject', 'Domain', 'Category', 'Priority', 'Status',
    'Requester Name', 'Requester Email', 'Assignee',
    'Created At', 'SLA Breach At', 'SLA Status', 'CSAT Score',
  ])

  const rows = (data ?? []).map((t: {
    zendesk_id: number; subject: string; domain: string; category: string;
    priority: string; status: string; requester_name: string; requester_email: string;
    assignee_name: string; zendesk_created_at: string; sla_breach_at: string | null
  }) => {
    const slaStatus = t.sla_breach_at
      ? (new Date(t.sla_breach_at) < new Date() ? 'Breached' : 'On Track')
      : ''
    return toRow([
      t.zendesk_id, t.subject, t.domain, t.category, t.priority, t.status,
      t.requester_name, t.requester_email, t.assignee_name,
      t.zendesk_created_at ? new Date(t.zendesk_created_at).toLocaleString('en-IN') : '',
      t.sla_breach_at ? new Date(t.sla_breach_at).toLocaleString('en-IN') : '',
      slaStatus,
      csatMap[t.zendesk_id] ?? '',
    ])
  })

  const csv = [header, ...rows].join('\r\n')
  const filename = `tickets-export-${new Date().toISOString().slice(0, 10)}.csv`

  return new NextResponse(csv, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
