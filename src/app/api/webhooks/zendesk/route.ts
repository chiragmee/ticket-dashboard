import { NextRequest, NextResponse } from 'next/server'
import { createHmac, timingSafeEqual } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { mapZendeskTicket } from '@/lib/zendesk/utils'

export async function POST(req: NextRequest) {
  const rawBody = await req.text()
  const secret = process.env.ZENDESK_WEBHOOK_SECRET!

  const signature = req.headers.get('x-zendesk-webhook-signature')

  if (signature) {
    // "Zendesk events" webhook — HMAC validation
    const expected = createHmac('sha256', secret).update(rawBody).digest('base64')
    try {
      const sigBuf = Buffer.from(signature)
      const expBuf = Buffer.from(expected)
      if (sigBuf.length !== expBuf.length || !timingSafeEqual(sigBuf, expBuf)) {
        return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
      }
    } catch {
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 })
    }
  } else {
    // "Trigger or automation" webhook — token in query param
    const token = req.nextUrl.searchParams.get('token') ?? ''
    const secretBuf = Buffer.from(secret)
    const tokenBuf = Buffer.from(token)
    const valid =
      secretBuf.length === tokenBuf.length && timingSafeEqual(secretBuf, tokenBuf)
    if (!valid) {
      return NextResponse.json({ error: 'Invalid token' }, { status: 401 })
    }
  }

  let payload: Record<string, unknown>
  try {
    payload = JSON.parse(rawBody)
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 })
  }

  const raw = (payload.ticket ?? payload) as Record<string, unknown>
  const ticket = mapZendeskTicket(raw as Parameters<typeof mapZendeskTicket>[0])

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
