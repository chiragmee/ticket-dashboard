import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { mapZendeskTicket } from '@/lib/zendesk/utils'

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get('authorization') ?? ''
  if (authHeader !== `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()

  const { data: logData, error: logError } = await supabase
    .from('sync_logs')
    .insert({ sync_type: 'incremental', status: 'running' })
    .select('id')
    .single()

  if (logError || !logData) {
    return NextResponse.json({ error: 'Failed to create sync log' }, { status: 500 })
  }

  const logId = logData.id
  const startTime = Math.floor((Date.now() - 15 * 60 * 1000) / 1000)

  const domain = process.env.ZENDESK_DOMAIN!
  const email = process.env.ZENDESK_EMAIL!
  const token = process.env.ZENDESK_API_TOKEN!
  const authBasic = Buffer.from(`${email}/token:${token}`).toString('base64')

  let totalProcessed = 0
  let nextUrl: string | null =
    `https://${domain}.zendesk.com/api/v2/incremental/tickets.json?start_time=${startTime}`

  try {
    while (nextUrl) {
      const res = await fetch(nextUrl, {
        headers: { Authorization: `Basic ${authBasic}` },
      })

      if (!res.ok) {
        throw new Error(`Zendesk API error: ${res.status} ${await res.text()}`)
      }

      const data = await res.json() as {
        tickets: Record<string, unknown>[]
        next_page: string | null
        end_of_stream: boolean
      }

      const tickets = (data.tickets ?? []).map((t) =>
        mapZendeskTicket(t as Parameters<typeof mapZendeskTicket>[0])
      )

      if (tickets.length > 0) {
        const { error } = await supabase
          .from('tickets')
          .upsert(tickets, { onConflict: 'zendesk_id', ignoreDuplicates: false })
        if (error) throw new Error(`Supabase upsert error: ${error.message}`)
        totalProcessed += tickets.length
      }

      nextUrl = data.end_of_stream ? null : (data.next_page ?? null)
    }

    await supabase
      .from('sync_logs')
      .update({ status: 'success', tickets_processed: totalProcessed, completed_at: new Date().toISOString() })
      .eq('id', logId)

    return NextResponse.json({ synced: totalProcessed, status: 'success' })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error'
    await supabase
      .from('sync_logs')
      .update({ status: 'failed', error_message: message, completed_at: new Date().toISOString() })
      .eq('id', logId)

    return NextResponse.json({ error: message, status: 'failed' }, { status: 500 })
  }
}
