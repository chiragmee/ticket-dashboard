import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { sendSlaBreachAlert } from '@/lib/email'

export async function GET(req: NextRequest) {
  // Protect with CRON_SECRET if set
  const secret = process.env.CRON_SECRET
  if (secret) {
    const auth = req.headers.get('authorization')
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
  }

  const admin = createAdminClient()
  const now = new Date()
  const warningThreshold = new Date(now.getTime() + 60 * 60 * 1000) // 1 hour ahead

  // Fetch all active tickets with SLA set and no alert sent yet
  const { data: tickets, error } = await admin
    .from('tickets')
    .select('zendesk_id, subject, requester_email, category, assignee_name, sla_breach_at, status, priority')
    .not('sla_breach_at', 'is', null)
    .is('sla_alert_sent_at', null)
    .not('status', 'in', '("resolved","closed")')

  if (error) {
    console.error('SLA check query error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const alertRecipients = (process.env.SLA_ALERT_EMAIL ?? '').split(',').map(e => e.trim()).filter(Boolean)
  if (alertRecipients.length === 0) {
    return NextResponse.json({ ok: true, skipped: 'No SLA_ALERT_EMAIL configured' })
  }

  const breached: number[] = []
  const warned: number[] = []

  for (const ticket of tickets ?? []) {
    const breachTime = new Date(ticket.sla_breach_at)
    const isBreached = breachTime <= now
    const isNearBreach = !isBreached && breachTime <= warningThreshold

    if (!isBreached && !isNearBreach) continue

    try {
      await sendSlaBreachAlert({
        to: alertRecipients,
        ticketId: ticket.zendesk_id,
        subject: ticket.subject,
        requesterEmail: ticket.requester_email ?? '',
        category: ticket.category ?? '',
        assigneeName: ticket.assignee_name ?? '',
        breachedAt: ticket.sla_breach_at,
        isWarning: !isBreached,
      })

      await admin
        .from('tickets')
        .update({ sla_alert_sent_at: now.toISOString() })
        .eq('zendesk_id', ticket.zendesk_id)

      if (isBreached) breached.push(ticket.zendesk_id)
      else warned.push(ticket.zendesk_id)
    } catch (err) {
      console.error(`Failed to send SLA alert for #${ticket.zendesk_id}:`, err)
    }
  }

  return NextResponse.json({
    ok: true,
    breached,
    warned,
    checked: (tickets ?? []).length,
  })
}
