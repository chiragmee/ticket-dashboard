const ZENDESK_DOMAIN = process.env.ZENDESK_DOMAIN!
const ZENDESK_EMAIL = process.env.ZENDESK_EMAIL!
const ZENDESK_API_TOKEN = process.env.ZENDESK_API_TOKEN!

const authHeader = () =>
  'Basic ' + Buffer.from(`${ZENDESK_EMAIL}/token:${ZENDESK_API_TOKEN}`).toString('base64')

const base = () => `https://${ZENDESK_DOMAIN}.zendesk.com/api/v2`

export async function getTicketComments(zendeskId: number) {
  const res = await fetch(`${base()}/tickets/${zendeskId}/comments.json`, {
    headers: { Authorization: authHeader() },
    cache: 'no-store',
  })
  if (!res.ok) throw new Error(`Zendesk comments error: ${res.status}`)
  const data = await res.json()
  return data.comments as ZendeskComment[]
}

export async function postTicketComment(zendeskId: number, body: string, isPublic: boolean) {
  const res = await fetch(`${base()}/tickets/${zendeskId}.json`, {
    method: 'PUT',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ticket: { comment: { body, public: isPublic, html_body: undefined } } }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Zendesk post comment error: ${res.status} ${text}`)
  }
  return res.json()
}

export async function updateTicketStatus(zendeskId: number, status: string) {
  // Map our internal statuses to Zendesk base statuses
  const statusMap: Record<string, string> = {
    open: 'open',
    pending: 'pending',
    in_progress: 'open', // custom status — kept as open at base level
    resolved: 'solved',
    closed: 'closed',
  }
  const zendeskStatus = statusMap[status] ?? 'open'
  const res = await fetch(`${base()}/tickets/${zendeskId}.json`, {
    method: 'PUT',
    headers: {
      Authorization: authHeader(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ ticket: { status: zendeskStatus } }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Zendesk status update error: ${res.status} ${text}`)
  }
  return res.json()
}

export type ZendeskComment = {
  id: number
  body: string
  public: boolean
  created_at: string
  author_id: number
  via: { channel: string }
  attachments: { file_name: string; content_url: string }[]
}
