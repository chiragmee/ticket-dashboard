'use client'

import { useState, useEffect, useCallback } from 'react'
import { useParams } from 'next/navigation'

type Ticket = {
  zendesk_id: number
  subject: string
  description: string
  status: string
  priority: string
  category: string
  domain: string
  requester_name: string
  requester_email: string
  assignee_name: string
  zendesk_created_at: string
  zendesk_updated_at: string
  sla_breach_at: string | null
}

type Comment = {
  id: number
  body: string
  public: boolean
  created_at: string
  author_id: number
  via?: { channel: string }
}

const STATUS_COLORS: Record<string, string> = {
  open: 'bg-blue-100 text-blue-700',
  pending: 'bg-yellow-100 text-yellow-700',
  in_progress: 'bg-purple-100 text-purple-700',
  resolved: 'bg-green-100 text-green-700',
  closed: 'bg-gray-100 text-gray-600',
}

const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-orange-100 text-orange-700',
  normal: 'bg-blue-100 text-blue-700',
  low: 'bg-gray-100 text-gray-600',
}

const DOMAIN_LABELS: Record<string, string> = {
  krt: 'KRT', brigade: 'Brigade', acb: 'ACB', other: 'Other',
}

function Avatar({ name }: { name: string }) {
  const initials = name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2)
  return (
    <div className="w-8 h-8 rounded-full bg-[#3B6EF0] flex items-center justify-center flex-shrink-0">
      <span className="text-white text-xs font-semibold">{initials || '?'}</span>
    </div>
  )
}

export default function TicketDetailPage() {
  const params = useParams()
  const id = params.id as string

  const [ticket, setTicket] = useState<Ticket | null>(null)
  const [comments, setComments] = useState<Comment[]>([])
  const [role, setRole] = useState<string>('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [replyBody, setReplyBody] = useState('')
  const [isPublic, setIsPublic] = useState(true)
  const [posting, setPosting] = useState(false)
  const [postError, setPostError] = useState('')

  const fetchTicket = useCallback(async () => {
    setLoading(true)
    const res = await fetch(`/api/tickets/${id}`)
    if (!res.ok) {
      setError('Ticket not found or you don\'t have access.')
      setLoading(false)
      return
    }
    const json = await res.json()
    setTicket(json.ticket)
    setComments(json.comments ?? [])
    setRole(json.role)
    setLoading(false)
  }, [id])

  useEffect(() => { fetchTicket() }, [fetchTicket])

  const handlePost = async () => {
    if (!replyBody.trim()) return
    setPosting(true)
    setPostError('')
    const res = await fetch(`/api/tickets/${id}/comment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ body: replyBody, isPublic }),
    })
    if (!res.ok) {
      const json = await res.json()
      setPostError(json.error ?? 'Failed to post comment')
    } else {
      setReplyBody('')
      fetchTicket()
    }
    setPosting(false)
  }

  const canReply = role === 'admin' || role === 'member'

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F4F6FB] flex items-center justify-center">
        <div className="text-sm text-[#6B7A99]">Loading ticket...</div>
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <div className="min-h-screen bg-[#F4F6FB] flex items-center justify-center">
        <div className="text-center">
          <div className="text-sm text-red-600 mb-3">{error || 'Ticket not found'}</div>
          <a href="/dashboard" className="text-sm text-[#3B6EF0] hover:underline">← Back to dashboard</a>
        </div>
      </div>
    )
  }

  const isOverdue = ticket.sla_breach_at && new Date(ticket.sla_breach_at) < new Date()

  return (
    <div className="min-h-screen bg-[#F4F6FB]">
      {/* Header */}
      <header className="bg-white border-b border-[#E5E9F2] px-6 py-4 flex items-center gap-4">
        <a href="/dashboard" className="text-sm text-[#6B7A99] hover:text-[#1E2A3B] flex items-center gap-1">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Dashboard
        </a>
        <span className="text-[#E5E9F2]">/</span>
        <span className="text-sm text-[#6B7A99] font-mono">#{ticket.zendesk_id}</span>
        <span className={`ml-auto px-2.5 py-1 rounded text-xs font-medium ${STATUS_COLORS[ticket.status] ?? 'bg-gray-100 text-gray-600'}`}>
          {ticket.status.replace('_', ' ')}
        </span>
      </header>

      <div className="max-w-6xl mx-auto p-6 grid grid-cols-3 gap-6">
        {/* Left: Description + Comments */}
        <div className="col-span-2 space-y-4">
          {/* Subject + description */}
          <div className="bg-white rounded-xl border border-[#E5E9F2] p-6">
            <h1 className="text-lg font-semibold text-[#1E2A3B] mb-4">{ticket.subject}</h1>
            <div className="text-sm text-[#4A5568] whitespace-pre-wrap leading-relaxed">
              {ticket.description || <span className="text-[#9BAABB] italic">No description provided.</span>}
            </div>
          </div>

          {/* Comments */}
          <div className="bg-white rounded-xl border border-[#E5E9F2] overflow-hidden">
            <div className="px-5 py-4 border-b border-[#E5E9F2]">
              <h2 className="text-sm font-semibold text-[#1E2A3B]">
                Conversation <span className="text-[#9BAABB] font-normal ml-1">({comments.length})</span>
              </h2>
            </div>

            <div className="divide-y divide-[#E5E9F2]">
              {comments.length === 0 ? (
                <div className="p-6 text-sm text-[#9BAABB] text-center">No comments yet.</div>
              ) : (
                comments.map((c) => (
                  <div key={c.id} className={`p-5 ${!c.public ? 'bg-amber-50' : ''}`}>
                    <div className="flex items-start gap-3">
                      <Avatar name={`Agent`} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-sm font-medium text-[#1E2A3B]">
                            {c.via?.channel === 'web' ? 'Customer' : 'Agent'}
                          </span>
                          {!c.public && (
                            <span className="px-1.5 py-0.5 rounded text-xs bg-amber-100 text-amber-700 font-medium">
                              Internal note
                            </span>
                          )}
                          <span className="text-xs text-[#9BAABB] ml-auto">
                            {new Date(c.created_at).toLocaleString()}
                          </span>
                        </div>
                        <p className="text-sm text-[#4A5568] whitespace-pre-wrap leading-relaxed">{c.body}</p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Reply form */}
            {canReply && (
              <div className="p-5 border-t border-[#E5E9F2] bg-[#FAFBFF]">
                <div className="flex gap-2 mb-3">
                  <button
                    onClick={() => setIsPublic(true)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${isPublic ? 'bg-[#3B6EF0] text-white' : 'bg-white border border-[#E5E9F2] text-[#6B7A99]'}`}
                  >
                    Public reply
                  </button>
                  <button
                    onClick={() => setIsPublic(false)}
                    className={`px-3 py-1 rounded text-xs font-medium transition-colors ${!isPublic ? 'bg-amber-500 text-white' : 'bg-white border border-[#E5E9F2] text-[#6B7A99]'}`}
                  >
                    Internal note
                  </button>
                </div>
                <textarea
                  value={replyBody}
                  onChange={(e) => setReplyBody(e.target.value)}
                  placeholder={isPublic ? 'Write a reply to the customer...' : 'Write an internal note (only visible to your team)...'}
                  rows={4}
                  className={`w-full border rounded-lg px-3 py-2.5 text-sm focus:outline-none resize-none ${
                    !isPublic ? 'border-amber-200 bg-amber-50 focus:border-amber-400' : 'border-[#E5E9F2] focus:border-[#3B6EF0]'
                  }`}
                />
                {postError && (
                  <div className="mt-2 text-xs text-red-600">{postError}</div>
                )}
                <div className="flex justify-end mt-3">
                  <button
                    onClick={handlePost}
                    disabled={posting || !replyBody.trim()}
                    className="px-4 py-2 bg-[#3B6EF0] text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 transition-colors"
                  >
                    {posting ? 'Sending...' : isPublic ? 'Send reply' : 'Add note'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right: Ticket info */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl border border-[#E5E9F2] p-5 space-y-4">
            <h2 className="text-sm font-semibold text-[#1E2A3B]">Ticket Info</h2>

            {[
              { label: 'Ticket ID', value: `#${ticket.zendesk_id}` },
              { label: 'Priority', value: (
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_COLORS[ticket.priority] ?? 'bg-gray-100'}`}>
                  {ticket.priority}
                </span>
              )},
              { label: 'Category', value: (
                <span className="capitalize">{ticket.category}</span>
              )},
              { label: 'Domain', value: DOMAIN_LABELS[ticket.domain] ?? ticket.domain },
              { label: 'Requester', value: (
                <div>
                  <div className="font-medium text-[#1E2A3B]">{ticket.requester_name || '—'}</div>
                  <div className="text-xs text-[#9BAABB]">{ticket.requester_email}</div>
                </div>
              )},
              { label: 'Assignee', value: ticket.assignee_name || <span className="text-[#9BAABB]">Unassigned</span> },
              { label: 'Created', value: new Date(ticket.zendesk_created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
              { label: 'Last updated', value: new Date(ticket.zendesk_updated_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) },
            ].map(({ label, value }) => (
              <div key={label}>
                <div className="text-xs text-[#9BAABB] mb-1">{label}</div>
                <div className="text-sm text-[#4A5568]">{value}</div>
              </div>
            ))}

            {ticket.sla_breach_at && (
              <div>
                <div className="text-xs text-[#9BAABB] mb-1">SLA</div>
                <div className={`text-sm font-medium ${isOverdue ? 'text-red-600' : 'text-green-600'}`}>
                  {isOverdue ? '⚠ Breached' : '✓ On track'}
                  <div className="text-xs font-normal text-[#9BAABB] mt-0.5">
                    {new Date(ticket.sla_breach_at).toLocaleString()}
                  </div>
                </div>
              </div>
            )}
          </div>

          {(role === 'admin' || role === 'member') && (
            <a
              href={`https://${process.env.NEXT_PUBLIC_ZENDESK_SUBDOMAIN ?? 'selfemployed-31120'}.zendesk.com/agent/tickets/${ticket.zendesk_id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 w-full px-4 py-2.5 border border-[#E5E9F2] rounded-xl text-sm text-[#6B7A99] hover:text-[#1E2A3B] hover:border-[#3B6EF0] transition-colors bg-white"
            >
              Open in Zendesk
              <svg width="12" height="12" viewBox="0 0 10 10" fill="none">
                <path d="M1.5 8.5L8.5 1.5M8.5 1.5H3.5M8.5 1.5V6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </a>
          )}
        </div>
      </div>
    </div>
  )
}
