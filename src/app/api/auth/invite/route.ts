import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  // Verify caller is admin
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: callerProfile } = await admin
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (callerProfile?.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { email, full_name, role, domain_access } = await req.json()

  if (!email || !full_name || !role || !domain_access) {
    return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
  }

  // Invite user via Supabase Auth
  const { data: inviteData, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? 'https://ticket-dashboard-teal.vercel.app'}/auth/callback?next=/set-password`,
  })

  if (inviteError) {
    return NextResponse.json({ error: inviteError.message }, { status: 500 })
  }

  // Create profile
  const { error: profileError } = await admin.from('user_profiles').insert({
    user_id: inviteData.user.id,
    full_name,
    role,
    domain_access,
  })

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, message: `Invite sent to ${email}` })
}
