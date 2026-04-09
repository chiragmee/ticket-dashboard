import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const status = searchParams.get('status')
  const category = searchParams.get('category')
  const search = searchParams.get('search')
  const org = searchParams.get('org')
  const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'))
  const pageSize = Math.min(100, Math.max(1, parseInt(searchParams.get('pageSize') ?? '20')))
  const offset = (page - 1) * pageSize

  const supabase = createAdminClient()
  let query = supabase.from('tickets').select('*', { count: 'exact' })

  if (status) query = query.eq('status', status)
  if (category) query = query.eq('category', category)
  if (org) query = query.eq('requester_org', org)
  if (search) {
    query = query.or(
      `subject.ilike.%${search}%,requester_name.ilike.%${search}%,requester_email.ilike.%${search}%`
    )
  }

  query = query
    .order('zendesk_updated_at', { ascending: false })
    .range(offset, offset + pageSize - 1)

  const { data, error, count } = await query

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    data,
    count: count ?? 0,
    page,
    totalPages: Math.ceil((count ?? 0) / pageSize),
  })
}
