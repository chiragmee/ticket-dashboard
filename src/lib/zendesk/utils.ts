// Default SLA fallback (used when DB config isn't available)
export const DEFAULT_SLA_HOURS: Record<string, number> = {
  urgent: 4,
  high: 8,
  normal: 24,
  low: 48,
}

export function computeSlaBreachAt(
  priority: string,
  createdAt: string,
  config: Record<string, number> = DEFAULT_SLA_HOURS
): string {
  const hours = config[priority] ?? DEFAULT_SLA_HOURS[priority] ?? 24
  const d = new Date(createdAt)
  d.setHours(d.getHours() + hours)
  return d.toISOString()
}

export function deriveDomain(subject: string, description: string, ccEmails: string): string {
  const text = `${subject} ${description} ${ccEmails}`.toLowerCase()

  // KRT: Knowledge Realty Trust, KRT, Nucleus, Spark
  if (/\b(knowledge realty trust|krt|nucleus|spark)\b/.test(text)) return 'krt'

  // Brigade: Brigade, Brigade NXT, Brigade WTC
  if (/\bbrigade\b/.test(text)) return 'brigade'

  // ACB: Anacity Business, ACB
  if (/\b(anacity business|acb)\b/.test(text)) return 'acb'

  return 'other'
}

export function deriveCategory(tags: string[]): string {
  if (tags.includes('bug') || tags.includes('defect')) return 'bug'
  if (tags.includes('feature-request') || tags.includes('feature_request') || tags.includes('enhancement')) return 'feature'
  return 'query'
}

export function mapZendeskTicket(raw: Record<string, unknown>, slaConfig: Record<string, number> = {}) {
  // Support both Zendesk API format and Trigger webhook format
  const id = Number(raw.id)
  const subject = (raw.subject ?? raw.title ?? '(no subject)') as string

  // Tags can be an array (API) or comma-separated string (trigger)
  let tags: string[] = []
  if (Array.isArray(raw.tags)) {
    tags = raw.tags as string[]
  } else if (typeof raw.tags === 'string' && raw.tags) {
    tags = raw.tags.split(',').map((t) => t.trim()).filter(Boolean)
  }

  const statusMap: Record<string, string> = {
    new: 'open',
    open: 'open',
    pending: 'pending',
    hold: 'pending',
    solved: 'resolved',
    closed: 'closed',
  }

  // custom_status takes priority — handles "In Progress" and other custom statuses
  const customStatus = (raw.custom_status as string)?.toLowerCase().replace(/\s+/g, '_')
  const baseStatus = statusMap[(raw.status as string)?.toLowerCase()] ?? 'open'
  const validStatuses = ['open', 'pending', 'in_progress', 'resolved', 'closed']
  const status = customStatus && validStatuses.includes(customStatus) ? customStatus : baseStatus
  const rawPriority = (raw.priority as string)?.toLowerCase() ?? 'normal'
  const priority = ['low', 'normal', 'high', 'urgent'].includes(rawPriority) ? rawPriority : 'normal'

  // requester can be an object (API) or flat strings (trigger)
  const requester = raw.requester as Record<string, string> | undefined
  const requesterEmail = requester?.email ?? (raw.requester_email as string) ?? ''
  const requesterName = requester?.name ?? (raw.requester_name as string) ?? ''

  const assignee = raw.assignee as Record<string, string> | undefined
  const assigneeName = assignee?.name ?? (raw.assignee_name as string) ?? ''

  const createdAt = (raw.created_at ?? raw.zendesk_created_at ?? new Date().toISOString()) as string
  const updatedAt = (raw.updated_at ?? raw.zendesk_updated_at ?? new Date().toISOString()) as string
  const description = (raw.description ?? '') as string
  const ccEmails = (raw.cc_emails ?? raw.email_ccs ?? '') as string

  return {
    zendesk_id: id,
    subject,
    description,
    status,
    priority,
    category: deriveCategory(tags),
    domain: deriveDomain(subject, description, ccEmails),
    requester_email: requesterEmail,
    requester_name: requesterName,
    requester_org: '',
    assignee_name: assigneeName,
    tags,
    sla_breach_at: ((raw.due_at as string | null) ?? computeSlaBreachAt(priority, createdAt, slaConfig)),
    zendesk_created_at: createdAt,
    zendesk_updated_at: updatedAt,
    synced_at: new Date().toISOString(),
  }
}
