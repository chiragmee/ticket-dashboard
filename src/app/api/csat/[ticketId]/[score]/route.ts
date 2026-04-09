import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ ticketId: string; score: string }> }
) {
  const { ticketId, score } = await params
  const rating = parseInt(score)

  if (isNaN(rating) || rating < 1 || rating > 5) {
    return NextResponse.redirect(new URL('/csat/invalid', req.url))
  }

  const admin = createAdminClient()
  await admin.from('ticket_csat').upsert(
    { zendesk_id: parseInt(ticketId), score: rating, submitted_at: new Date().toISOString() },
    { onConflict: 'zendesk_id' }
  )

  return NextResponse.redirect(new URL(`/csat/thank-you?score=${rating}`, req.url))
}
