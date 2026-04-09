export function deriveCategory(tags: string[]): string {
  if (tags.includes('bug') || tags.includes('defect')) return 'bug'
  if (tags.includes('feature-request') || tags.includes('feature_request')) return 'feature'
  if (tags.includes('enhancement')) return 'enhancement'
  return 'query'
}

export function mapZendeskTicket(raw: {
  id: number
  subject: string
  description?: string
  status: string
  priority?: string
  tags?: string[]
  requester?: { email?: string; name?: string }
  requester_id?: number
  organization_id?: number
  assignee?: { name?: string }
  via?: unknown
  created_at: string
  updated_at: string
  due_at?: string
  [key: string]: unknown
}) {
  const tags: string[] = raw.tags ?? []

  const statusMap: Record<string, string> = {
    new: 'open',
    open: 'open',
    pending: 'pending',
    hold: 'pending',
    solved: 'resolved',
    closed: 'closed',
  }

  return {
    zendesk_id: raw.id,
    subject: raw.subject ?? '(no subject)',
    description: raw.description ?? '',
    status: statusMap[raw.status] ?? 'open',
    priority: raw.priority ?? 'normal',
    category: deriveCategory(tags),
    requester_email: (raw.requester as { email?: string } | undefined)?.email ?? '',
    requester_name: (raw.requester as { name?: string } | undefined)?.name ?? '',
    requester_org: '',
    assignee_name: (raw.assignee as { name?: string } | undefined)?.name ?? '',
    tags: tags,
    sla_breach_at: raw.due_at ?? null,
    zendesk_created_at: raw.created_at,
    zendesk_updated_at: raw.updated_at,
    synced_at: new Date().toISOString(),
  }
}
