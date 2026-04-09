export function deriveCategory(tags: string[]): string {
  if (tags.includes('bug') || tags.includes('defect')) return 'bug'
  if (tags.includes('feature-request') || tags.includes('feature_request')) return 'feature'
  if (tags.includes('enhancement')) return 'enhancement'
  return 'query'
}

export function mapZendeskTicket(raw: Record<string, unknown>) {
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

  const status = statusMap[(raw.status as string)?.toLowerCase()] ?? 'open'
  const priority = (raw.priority as string)?.toLowerCase() ?? 'normal'

  // requester can be an object (API) or flat strings (trigger)
  const requester = raw.requester as Record<string, string> | undefined
  const requesterEmail = requester?.email ?? (raw.requester_email as string) ?? ''
  const requesterName = requester?.name ?? (raw.requester_name as string) ?? ''

  const assignee = raw.assignee as Record<string, string> | undefined
  const assigneeName = assignee?.name ?? (raw.assignee_name as string) ?? ''

  const createdAt = (raw.created_at ?? raw.zendesk_created_at ?? new Date().toISOString()) as string
  const updatedAt = (raw.updated_at ?? raw.zendesk_updated_at ?? new Date().toISOString()) as string

  return {
    zendesk_id: id,
    subject,
    description: (raw.description ?? '') as string,
    status,
    priority: ['low', 'normal', 'high', 'urgent'].includes(priority) ? priority : 'normal',
    category: deriveCategory(tags),
    requester_email: requesterEmail,
    requester_name: requesterName,
    requester_org: '',
    assignee_name: assigneeName,
    tags,
    sla_breach_at: (raw.due_at ?? null) as string | null,
    zendesk_created_at: createdAt,
    zendesk_updated_at: updatedAt,
    synced_at: new Date().toISOString(),
  }
}
