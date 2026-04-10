import { Resend } from 'resend'
import { acknowledgmentEmail, resolutionEmail, slaBreachEmail } from './templates'

const resend = new Resend(process.env.RESEND_API_KEY)
const FROM = 'TicketView <onboarding@resend.dev>'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? ''

export async function sendAcknowledgment({
  to,
  requesterName,
  ticketId,
  subject,
  category,
}: {
  to: string
  requesterName: string
  ticketId: number
  subject: string
  category: string
}) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: `[#${ticketId}] We've received your request — TicketView`,
    html: acknowledgmentEmail({ requesterName, ticketId, subject, category }),
  })
}

export async function sendResolutionEmail({
  to,
  requesterName,
  ticketId,
  subject,
}: {
  to: string
  requesterName: string
  ticketId: number
  subject: string
}) {
  const csatUrl = `${SITE_URL}/api/csat/${ticketId}`
  return resend.emails.send({
    from: FROM,
    to,
    subject: `[#${ticketId}] Your ticket has been resolved — How did we do?`,
    html: resolutionEmail({ requesterName, ticketId, subject, csatUrl }),
  })
}

export async function sendSlaBreachAlert({
  to,
  ticketId,
  subject,
  requesterEmail,
  category,
  assigneeName,
  breachedAt,
  isWarning = false,
}: {
  to: string[]
  ticketId: number
  subject: string
  requesterEmail: string
  category: string
  assigneeName: string
  breachedAt: string
  isWarning?: boolean
}) {
  const emailSubject = isWarning
    ? `⏰ SLA Warning — Ticket #${ticketId} breaches in under 1 hour`
    : `🚨 SLA Breach — Ticket #${ticketId} needs immediate attention`
  return resend.emails.send({
    from: FROM,
    to,
    subject: emailSubject,
    html: slaBreachEmail({ ticketId, subject, requesterEmail, category, assigneeName, breachedAt, isWarning }),
  })
}
