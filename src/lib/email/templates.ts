const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? ''

const SLA_BY_CATEGORY: Record<string, string> = {
  bug: '4 hours',
  query: '24 hours',
  feature: '72 hours',
  other: '48 hours',
}

const CATEGORY_LABEL: Record<string, string> = {
  bug: 'Bug Report',
  query: 'Query',
  feature: 'Feature Request',
  other: 'General',
}

function baseWrapper(content: string) {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1.0" /></head>
<body style="margin:0;padding:0;background:#F4F6FB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:40px 20px;">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;border:1px solid #E5E9F2;overflow:hidden;">
        <tr>
          <td style="background:#1A2038;padding:24px 32px;">
            <table cellpadding="0" cellspacing="0"><tr>
              <td style="background:#3B6EF0;border-radius:10px;width:36px;height:36px;text-align:center;vertical-align:middle;">
                <span style="color:#ffffff;font-weight:700;font-size:13px;">TV</span>
              </td>
              <td style="padding-left:12px;">
                <div style="color:#ffffff;font-weight:700;font-size:17px;">TicketView</div>
                <div style="color:rgba(255,255,255,0.4);font-size:11px;margin-top:1px;">Support Dashboard</div>
              </td>
            </tr></table>
          </td>
        </tr>
        <tr><td style="padding:32px 32px 24px;">${content}</td></tr>
        <tr>
          <td style="background:#F4F6FB;padding:14px 32px;border-top:1px solid #E5E9F2;">
            <p style="margin:0;font-size:11px;color:#9BAABB;text-align:center;">© 2026 TicketView · This is an automated message, please do not reply to this email.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`
}

export function acknowledgmentEmail({
  requesterName,
  ticketId,
  subject,
  category,
}: {
  requesterName: string
  ticketId: number
  subject: string
  category: string
}) {
  const sla = SLA_BY_CATEGORY[category] ?? '48 hours'
  const catLabel = CATEGORY_LABEL[category] ?? 'General'

  const content = `
    <h1 style="margin:0 0 6px;font-size:20px;font-weight:700;color:#1E2A3B;">We've received your request</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#6B7A99;">Hi ${requesterName}, your ticket has been logged and our team is on it.</p>

    <div style="background:#F4F6FB;border-radius:12px;padding:20px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding-bottom:12px;">
            <div style="font-size:11px;color:#9BAABB;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Ticket ID</div>
            <div style="font-size:15px;font-weight:700;color:#3B6EF0;font-family:monospace;">#${ticketId}</div>
          </td>
        </tr>
        <tr>
          <td style="padding-bottom:12px;">
            <div style="font-size:11px;color:#9BAABB;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Subject</div>
            <div style="font-size:14px;color:#1E2A3B;">${subject}</div>
          </td>
        </tr>
        <tr>
          <td style="padding-bottom:12px;">
            <div style="font-size:11px;color:#9BAABB;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Type</div>
            <div style="font-size:14px;color:#1E2A3B;">${catLabel}</div>
          </td>
        </tr>
        <tr>
          <td>
            <div style="font-size:11px;color:#9BAABB;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:4px;">Expected Response</div>
            <div style="font-size:14px;font-weight:600;color:#22C55E;">Within ${sla}</div>
          </td>
        </tr>
      </table>
    </div>

    <p style="margin:0 0 20px;font-size:14px;color:#6B7A99;line-height:1.6;">
      Please keep this ticket ID for reference. Our team will reach out to you shortly. If you have additional information to share, you can reply to this email or contact your account manager.
    </p>

    <p style="margin:0;font-size:12px;color:#9BAABB;line-height:1.6;">
      You'll receive an update as soon as there's progress on your ticket.
    </p>
  `
  return baseWrapper(content)
}

export function resolutionEmail({
  requesterName,
  ticketId,
  subject,
  csatUrl,
}: {
  requesterName: string
  ticketId: number
  subject: string
  csatUrl: string
}) {
  const stars = [1, 2, 3, 4, 5].map(n => `
    <td style="padding:0 4px;">
      <a href="${csatUrl}/${n}" style="display:inline-block;width:40px;height:40px;background:#F4F6FB;border-radius:8px;text-align:center;line-height:40px;font-size:20px;text-decoration:none;">
        ${'⭐'}
      </a>
    </td>
  `).join('')

  const ratingButtons = [
    { score: 1, label: '😞', color: '#EF4444' },
    { score: 2, label: '😕', color: '#F97316' },
    { score: 3, label: '😐', color: '#EAB308' },
    { score: 4, label: '😊', color: '#22C55E' },
    { score: 5, label: '😄', color: '#3B6EF0' },
  ].map(({ score, label, color }) => `
    <td style="padding:0 4px;text-align:center;">
      <a href="${csatUrl}/${score}" style="display:inline-block;text-decoration:none;">
        <div style="width:44px;height:44px;background:#F4F6FB;border-radius:10px;text-align:center;line-height:44px;font-size:22px;margin-bottom:4px;">${label}</div>
        <div style="font-size:10px;color:#9BAABB;">${score}</div>
      </a>
    </td>
  `).join('')

  const content = `
    <h1 style="margin:0 0 6px;font-size:20px;font-weight:700;color:#1E2A3B;">Your ticket has been resolved ✓</h1>
    <p style="margin:0 0 24px;font-size:14px;color:#6B7A99;">Hi ${requesterName}, ticket <strong style="color:#3B6EF0;font-family:monospace;">#${ticketId}</strong> has been marked as resolved.</p>

    <div style="background:#F0FDF4;border:1px solid #BBF7D0;border-radius:12px;padding:16px 20px;margin-bottom:24px;">
      <div style="font-size:13px;color:#16A34A;font-weight:600;">✓ Resolved</div>
      <div style="font-size:14px;color:#1E2A3B;margin-top:4px;">${subject}</div>
    </div>

    <div style="margin-bottom:24px;">
      <div style="font-size:14px;font-weight:600;color:#1E2A3B;margin-bottom:12px;">How did we do? Rate your experience:</div>
      <table cellpadding="0" cellspacing="0"><tr>${ratingButtons}</tr></table>
      <div style="font-size:11px;color:#9BAABB;margin-top:8px;">1 = Very poor · 5 = Excellent</div>
    </div>

    <p style="margin:0;font-size:12px;color:#9BAABB;line-height:1.6;">
      If your issue is not fully resolved, you can reply to this email or raise a new ticket and reference <strong>#${ticketId}</strong>.
    </p>
  `
  return baseWrapper(content)
}

export function slaBreachEmail({
  ticketId,
  subject,
  requesterEmail,
  category,
  assigneeName,
  breachedAt,
  isWarning = false,
}: {
  ticketId: number
  subject: string
  requesterEmail: string
  category: string
  assigneeName: string
  breachedAt: string
  isWarning?: boolean
}) {
  const content = `
    <div style="background:${isWarning ? '#FFFBEB' : '#FEF2F2'};border:1px solid ${isWarning ? '#FDE68A' : '#FECACA'};border-radius:12px;padding:16px 20px;margin-bottom:24px;">
      <div style="font-size:13px;color:${isWarning ? '#B45309' : '#DC2626'};font-weight:700;">${isWarning ? '⏰ SLA Warning' : '🚨 SLA Breach Alert'}</div>
      <div style="font-size:13px;color:${isWarning ? '#D97706' : '#EF4444'};margin-top:4px;">${isWarning ? 'This ticket will breach its SLA in under 1 hour. Please take action now.' : 'This ticket has exceeded its SLA deadline and requires immediate attention.'}</div>
    </div>

    <h2 style="margin:0 0 16px;font-size:17px;font-weight:700;color:#1E2A3B;">Ticket Details</h2>

    <div style="background:#F4F6FB;border-radius:12px;padding:20px;margin-bottom:24px;">
      <table width="100%" cellpadding="0" cellspacing="0">
        ${[
          ['Ticket ID', `<span style="font-family:monospace;color:#3B6EF0;font-weight:700;">#${ticketId}</span>`],
          ['Subject', subject],
          ['Category', category],
          ['Requester', requesterEmail],
          ['Assigned To', assigneeName || 'Unassigned'],
          ['SLA Breached At', new Date(breachedAt).toLocaleString('en-IN')],
        ].map(([label, val]) => `
          <tr>
            <td style="padding-bottom:12px;width:40%;">
              <div style="font-size:11px;color:#9BAABB;text-transform:uppercase;letter-spacing:0.5px;">${label}</div>
            </td>
            <td style="padding-bottom:12px;">
              <div style="font-size:14px;color:#1E2A3B;">${val}</div>
            </td>
          </tr>
        `).join('')}
      </table>
    </div>

    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="background:#3B6EF0;border-radius:10px;">
          <a href="${SITE_URL}/dashboard/tickets/${ticketId}" style="display:inline-block;padding:12px 24px;color:#ffffff;font-weight:600;font-size:14px;text-decoration:none;">
            View Ticket →
          </a>
        </td>
      </tr>
    </table>
  `
  return baseWrapper(content)
}
