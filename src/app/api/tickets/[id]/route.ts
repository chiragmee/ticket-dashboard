import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTicketComments } from '@/lib/zendesk/api'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabaseUser = await createClient()
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('role, domain_access')
    .eq('user_id', user.id)
    .single()

  // Fetch ticket from DB
  const { data: ticket, error } = await admin
    .from('tickets')
    .select('*')
    .eq('zendesk_id', id)
    .single()

  if (error || !ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

  // Enforce domain access for non-admin users
  const isAdmin = profile?.role === 'admin'
  const userDomain = profile?.domain_access
  if (!isAdmin && userDomain !== 'all' && ticket.domain !== userDomain) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Fetch comments from Zendesk
  let comments = []
  try {
    comments = await getTicketComments(Number(id))
  } catch {
    // Return ticket even if comments fail
  }

  return NextResponse.json({ ticket, comments, role: profile?.role })
}
