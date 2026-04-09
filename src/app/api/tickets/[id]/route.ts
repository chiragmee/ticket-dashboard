import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getTicketComments, updateTicketStatus } from '@/lib/zendesk/api'
import { sendResolutionEmail } from '@/lib/email'

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
  let comments: Awaited<ReturnType<typeof getTicketComments>> = []
  try {
    comments = await getTicketComments(Number(id))
  } catch {
    // Return ticket even if comments fail
  }

  return NextResponse.json({ ticket, comments, role: profile?.role })
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabaseUser = await createClient()
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  if (profile?.role === 'client') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const { status } = await req.json()
  if (!status) return NextResponse.json({ error: 'Status required' }, { status: 400 })

  try {
    // Get current ticket before updating (to detect resolution)
    const { data: existing } = await admin
      .from('tickets')
      .select('status, requester_email, requester_name, subject, zendesk_id')
      .eq('zendesk_id', id)
      .single()

    await updateTicketStatus(Number(id), status)
    await admin.from('tickets').update({ status }).eq('zendesk_id', id)

    // Send CSAT email when ticket is resolved
    if (existing && existing.status !== 'resolved' && status === 'resolved' && existing.requester_email) {
      sendResolutionEmail({
        to: existing.requester_email,
        requesterName: existing.requester_name || 'there',
        ticketId: existing.zendesk_id,
        subject: existing.subject,
      }).catch(console.error)
    }

    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to update status'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
