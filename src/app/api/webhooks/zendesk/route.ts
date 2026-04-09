import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { mapZendeskTicket } from '@/lib/zendesk/utils'
import { classifyCategory, classifyDomain } from '@/lib/ai/classify'

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
  const { error } = await supabase
    .from('tickets')
    .upsert(ticket, { onConflict: 'zendesk_id', ignoreDuplicates: false })

  if (error) {
    console.error('Supabase upsert error:', error)
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  return NextResponse.json({ ok: true }, { status: 200 })
}
