import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('sla_config')
    .select('priority, hours')
    .order('hours', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ config: data })
}

export async function PATCH(req: NextRequest) {
  const supabaseUser = await createClient()
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { updates } = await req.json() as { updates: { priority: string; hours: number }[] }
  if (!Array.isArray(updates) || updates.length === 0) {
    return NextResponse.json({ error: 'updates array required' }, { status: 400 })
  }

  for (const row of updates) {
    if (!row.priority || typeof row.hours !== 'number' || row.hours < 1) {
      return NextResponse.json({ error: `Invalid entry: ${JSON.stringify(row)}` }, { status: 400 })
    }
    await admin
      .from('sla_config')
      .update({ hours: row.hours, updated_at: new Date().toISOString() })
      .eq('priority', row.priority)
  }

  return NextResponse.json({ ok: true })
}
