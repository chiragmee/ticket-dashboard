import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { mapZendeskTicket } from '@/lib/zendesk/utils'
import { classifyCategory, classifyDomain } from '@/lib/ai/classify'
import { sendAcknowledgment, sendResolutionEmail } from '@/lib/email'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const raw = (payload.ticket ?? payload) as Record<string, unknown>
  const ticket = mapZendeskTicket(raw)

  // AI classification — runs in parallel for speed
  const [aiCategory, aiDomain] = await Promise.all([
    classifyCategory(ticket.subject, ticket.description),
    ticket.domain === 'other'
      ? classifyDomain(ticket.subject, ticket.description)
      : Promise.resolve(ticket.domain),
  ])

  ticket.category = aiCategory
  ticket.domain = aiDomain

  const supabase = createAdminClient()

  // Check if ticket already exists to detect new vs update
  const { data: existing } = await supabase
    .from('tickets')
    .select('zendesk_id, status')
    .eq('zendesk_id', ticket.zendesk_id)
    .single()

  const isNew = !existing
  const justResolved = !isNew &&
    existing.status !== ticket.status &&
    (ticket.status === 'resolved' || ticket.status === 'closed')

  const { error } = await supabase
    .from('tickets')
    .upsert(ticket, { onConflict: 'zendesk_id', ignoreDuplicates: false })

  if (error) {
    console.error('Supabase upsert error:', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  // Send emails (fire-and-forget, don't block webhook response)
  if (ticket.requester_email) {
    if (isNew) {
      sendAcknowledgment({
        to: ticket.requester_email,
        requesterName: ticket.requester_name || 'there',
        ticketId: ticket.zendesk_id,
        subject: ticket.subject,
        category: ticket.category,
      }).catch(console.error)
    }

    if (justResolved) {
      sendResolutionEmail({
        to: ticket.requester_email,
        requesterName: ticket.requester_name || 'there',
        ticketId: ticket.zendesk_id,
        subject: ticket.subject,
      }).catch(console.error)
    }
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
