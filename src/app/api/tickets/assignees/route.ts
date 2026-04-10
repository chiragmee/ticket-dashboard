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

  let query = admin
    .from('tickets')
    .select('assignee_name')
    .not('assignee_name', 'is', null)
    .neq('assignee_name', '')

  if (!isAdmin && userDomain && userDomain !== 'all') {
    query = query.eq('domain', userDomain)
  }

  const { data } = await query
  const unique = [...new Set((data ?? []).map((r: { assignee_name: string }) => r.assignee_name))].sort()
  return NextResponse.json({ assignees: unique })
}
