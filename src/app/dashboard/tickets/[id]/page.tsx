'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
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

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open', dot: 'bg-red-500', badge: 'bg-red-100 text-red-700' },
  { value: 'in_progress', label: 'In Progress', dot: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700' },
  { value: 'pending', label: 'Pending', dot: 'bg-blue-500', badge: 'bg-blue-100 text-blue-700' },
  { value: 'resolved', label: 'Resolved', dot: 'bg-gray-400', badge: 'bg-gray-100 text-gray-600' },
]

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
  const initials = (name || '?').split(' ').map((w: string) => w[0]).join('').toUpperCase().slice(0, 2)
  return (
    <div className="w-8 h-8 rounded-full bg-[#3B6EF0] flex items-center justify-center flex-shrink-0">
      <span className="text-white text-xs font-semibold">{initials}</span>
    </div>
  )
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  const days = Math.floor(hrs / 24)
  return `${days}d ago`
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

  const [currentStatus, setCurrentStatus] = useState('')
  const [statusUpdating, setStatusUpdating] = useState(false)
  const [submitAsStatus, setSubmitAsStatus] = useState('')
  const [showStatusDropdown, setShowStatusDropdown] = useState(false)

  const conversationEndRef = useRef<HTMLDivElement>(null)

  const fetchTicket = useCallback(async () => {
    const res = await fetch(`/api/tickets/${id}`)
    if (!res.ok) {
      setError("Ticket not found or you don't have access.")
      setLoading(false)
      return
    }
    const json = await res.json()
    setTicket(json.ticket)
    setComments(json.comments ?? [])
    setRole(json.role)
    setCurrentStatus(json.ticket.status)
    setSubmitAsStatus(json.ticket.status)
    setLoading(false)
  }, [id])

  useEffect(() => { fetchTicket() }, [fetchTicket])

  const TERMINAL_STATUSES = ['resolved']

  const handleStatusChange = async (newStatus: string, force = false) => {
    if (newStatus === currentStatus) return
    // Block status change to resolved/closed if there's an unsent reply (only from dropdown)
    if (!force && TERMINAL_STATUSES.includes(newStatus) && replyBody.trim()) {
      setPostError('You have an unsent reply. Please send it before changing the status.')
      return
    }
    setStatusUpdating(true)
    const res = await fetch(`/api/tickets/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus }),
    })
    if (res.ok) {
      setCurrentStatus(newStatus)
      if (ticket) setTicket({ ...ticket, status: newStatus })
    }
    setStatusUpdating(false)
  }

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
      setPostError(json.error ?? 'Failed to post. Please try again.')
      setPosting(false)
      return
    }
    setReplyBody('')
    if (submitAsStatus !== currentStatus) {
      await handleStatusChange(submitAsStatus, true)
    }
    await fetchTicket()
    setTimeout(() => conversationEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100)
    setPosting(false)
  }

  const canReply = (role === 'admin' || role === 'member') && ticket?.status !== 'resolved'
  const currentStatusOption = STATUS_OPTIONS.find(s => s.value === currentStatus) ?? STATUS_OPTIONS[0]

  if (loading) {
    return (
      <div className="h-screen bg-[#F4F6FB] flex items-center justify-center">
        <div className="text-sm text-[#6B7A99]">Loading ticket...</div>
      </div>
    )
  }

  if (error || !ticket) {
    return (
      <div className="h-screen bg-[#F4F6FB] flex items-center justify-center">
        <div className="text-center space-y-3">
          <div className="text-sm text-red-600">{error || 'Ticket not found'}</div>
          <a href="/dashboard" className="text-sm text-[#3B6EF0] hover:underline">← Back to dashboard</a>
        </div>
      </div>
    )
  }

  const isOverdue = ticket.sla_breach_at && new Date(ticket.sla_breach_at) < new Date()
  // First comment = original request from customer; rest = conversation
  const [firstComment, ...threadComments] = comments

  return (
    <div className="h-screen flex flex-col bg-[#F4F6FB] overflow-hidden">
      {/* Top header bar */}
      <header className="bg-white border-b border-[#E5E9F2] px-6 py-3 flex items-center gap-3 flex-shrink-0">
        <a href="/dashboard" className="flex items-center gap-1 text-sm text-[#6B7A99] hover:text-[#1E2A3B]">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M10 12L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          Dashboard
        </a>
        <span className="text-[#D1D9E6]">/</span>
        <span className="text-sm text-[#6B7A99] font-mono">#{ticket.zendesk_id}</span>
        <span className="text-sm font-medium text-[#1E2A3B] truncate flex-1">{ticket.subject}</span>

        {/* Current status badge — read only in header */}
        <span className={`text-xs font-medium px-3 py-1.5 rounded-lg flex items-center gap-1.5 ${currentStatusOption?.badge ?? 'bg-gray-100 text-gray-600'}`}>
          <span className={`w-2 h-2 rounded-full ${currentStatusOption?.dot ?? 'bg-gray-400'}`} />
          {currentStatusOption?.label ?? currentStatus}
        </span>
      </header>

      {/* Main two-panel layout */}
      <div className="flex flex-1 overflow-hidden gap-0">

        {/* LEFT PANEL — always visible, original request + metadata */}
        <div className="w-80 flex-shrink-0 flex flex-col overflow-y-auto bg-white border-r border-[#E5E9F2]">

          {/* Original request */}
          <div className="p-5 border-b border-[#E5E9F2]">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-xs font-semibold text-[#3B6EF0] uppercase tracking-wide">Original Request</span>
            </div>
            <div className="flex items-start gap-3 mb-3">
              <Avatar name={ticket.requester_name || ticket.requester_email} />
              <div>
                <div className="text-sm font-medium text-[#1E2A3B]">{ticket.requester_name || 'Customer'}</div>
                <div className="text-xs text-[#9BAABB]">{ticket.requester_email}</div>
                <div className="text-xs text-[#9BAABB] mt-0.5">{new Date(ticket.zendesk_created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</div>
              </div>
            </div>
            <div className="text-sm text-[#4A5568] leading-relaxed whitespace-pre-wrap bg-[#F4F6FB] rounded-lg p-3 max-h-64 overflow-y-auto">
              {firstComment?.body || ticket.description || <span className="italic text-[#9BAABB]">No description</span>}
            </div>
          </div>

          {/* Ticket metadata */}
          <div className="p-5 space-y-3 border-b border-[#E5E9F2]">
            <div className="text-xs font-semibold text-[#9BAABB] uppercase tracking-wide mb-2">Details</div>

            {[
              { label: 'Priority', value: (
                <span className={`px-2 py-0.5 rounded text-xs font-medium capitalize ${PRIORITY_COLORS[ticket.priority] ?? 'bg-gray-100'}`}>
                  {ticket.priority}
                </span>
              )},
              { label: 'Category', value: <span className="text-sm capitalize text-[#4A5568]">{ticket.category}</span> },
              { label: 'Domain', value: <span className="text-sm text-[#4A5568]">{DOMAIN_LABELS[ticket.domain] ?? ticket.domain}</span> },
              { label: 'Assignee', value: <span className="text-sm text-[#4A5568]">{ticket.assignee_name || <span className="text-[#9BAABB]">Unassigned</span>}</span> },
              { label: 'Created', value: <span className="text-sm text-[#4A5568]">{new Date(ticket.zendesk_created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</span> },
              { label: 'Updated', value: <span className="text-sm text-[#4A5568]">{timeAgo(ticket.zendesk_updated_at)}</span> },
            ].map(({ label, value }) => (
              <div key={label} className="flex items-center justify-between gap-2">
                <span className="text-xs text-[#9BAABB] flex-shrink-0">{label}</span>
                <div className="text-right">{value}</div>
              </div>
            ))}

            {ticket.sla_breach_at && (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs text-[#9BAABB]">SLA</span>
                <span className={`text-xs font-medium ${isOverdue ? 'text-red-600' : 'text-green-600'}`}>
                  {isOverdue ? '⚠ Breached' : '✓ On track'}
                </span>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="p-5 space-y-2">
            {(role === 'admin' || role === 'member') && (
              <a
                href={`https://${process.env.NEXT_PUBLIC_ZENDESK_SUBDOMAIN ?? 'selfemployed-31120'}.zendesk.com/agent/tickets/${ticket.zendesk_id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full px-4 py-2 border border-[#E5E9F2] rounded-lg text-sm text-[#6B7A99] hover:text-[#1E2A3B] hover:border-[#3B6EF0] transition-colors"
              >
                Open in Zendesk
                <svg width="11" height="11" viewBox="0 0 10 10" fill="none">
                  <path d="M1.5 8.5L8.5 1.5M8.5 1.5H3.5M8.5 1.5V6.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </a>
            )}
          </div>
        </div>

        {/* RIGHT PANEL — conversation + reply */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Conversation thread (scrollable) */}
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
            {threadComments.length === 0 && (
              <div className="text-center text-sm text-[#9BAABB] py-8">
                No replies yet. Be the first to respond.
              </div>
            )}

            {threadComments.map((c) => {
              const isCustomer = c.via?.channel === 'web' || c.via?.channel === 'email'
              return (
                <div key={c.id} className={`flex gap-3 ${isCustomer ? 'justify-start' : 'justify-end'}`}>
                  {isCustomer && <Avatar name={ticket.requester_name || 'Customer'} />}
                  <div className="max-w-[70%] flex flex-col gap-1">
                    <div className={`flex items-center gap-2 ${isCustomer ? '' : 'justify-end'}`}>
                      <span className="text-xs font-medium text-[#1E2A3B]">
                        {isCustomer ? (ticket.requester_name || 'Customer') : (ticket.assignee_name || 'Agent')}
                      </span>
                      {!c.public && (
                        <span className="px-1.5 py-0.5 rounded text-xs bg-amber-100 text-amber-700 font-medium">Internal</span>
                      )}
                      <span className="text-xs text-[#9BAABB]">{timeAgo(c.created_at)}</span>
                    </div>
                    <div className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap break-words ${
                      !c.public
                        ? 'bg-amber-50 border border-amber-200 text-amber-900'
                        : isCustomer
                          ? 'bg-white border border-[#E5E9F2] text-[#4A5568]'
                          : 'bg-[#3B6EF0] text-white'
                    }`}>
                      {c.body}
                    </div>
                  </div>
                  {!isCustomer && <Avatar name={ticket.assignee_name || 'Agent'} />}
                </div>
              )
            })}
            <div ref={conversationEndRef} />
          </div>

          {/* Reply form (fixed at bottom) */}
          {canReply && (
            <div className="border-t border-[#E5E9F2] bg-white p-4 flex-shrink-0">
              <div className="flex gap-2 mb-3">
                <button
                  onClick={() => setIsPublic(true)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${isPublic ? 'bg-[#3B6EF0] text-white' : 'bg-[#F4F6FB] text-[#6B7A99] hover:text-[#1E2A3B]'}`}
                >
                  Public reply
                </button>
                <button
                  onClick={() => setIsPublic(false)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${!isPublic ? 'bg-amber-500 text-white' : 'bg-[#F4F6FB] text-[#6B7A99] hover:text-[#1E2A3B]'}`}
                >
                  Internal note
                </button>
              </div>
              <textarea
                value={replyBody}
                onChange={(e) => setReplyBody(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handlePost() }}
                placeholder={isPublic ? 'Write a reply to the customer... (⌘Enter to send)' : 'Write an internal note...'}
                rows={3}
                className={`w-full border rounded-xl px-3 py-2.5 text-sm focus:outline-none resize-none mb-3 ${
                  !isPublic ? 'border-amber-200 bg-amber-50 focus:border-amber-400' : 'border-[#E5E9F2] focus:border-[#3B6EF0]'
                }`}
              />

              {/* Zendesk-style Submit button */}
              <div className="flex items-center justify-between">
                <div>{postError && <span className="text-xs text-red-600">{postError}</span>}</div>
                <div className="relative flex items-center">
                  {/* Main submit button */}
                  <button
                    onClick={handlePost}
                    disabled={posting || !replyBody.trim()}
                    className="px-5 py-2.5 bg-[#1A2038] text-white text-sm font-semibold rounded-l-xl hover:bg-[#2a3250] disabled:opacity-50 transition-colors"
                  >
                    {posting ? 'Submitting...' : `Submit as ${STATUS_OPTIONS.find(s => s.value === submitAsStatus)?.label ?? submitAsStatus}`}
                  </button>
                  {/* Caret to open status picker */}
                  <button
                    onClick={() => setShowStatusDropdown(v => !v)}
                    className="px-2.5 py-2.5 bg-[#1A2038] text-white rounded-r-xl hover:bg-[#2a3250] border-l border-white/20 transition-colors"
                  >
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                      <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </button>

                  {/* Status dropdown */}
                  {showStatusDropdown && (
                    <div className="absolute bottom-12 right-0 bg-white border border-[#E5E9F2] rounded-xl shadow-lg py-1 w-44 z-10">
                      {STATUS_OPTIONS.map(s => (
                        <button
                          key={s.value}
                          onClick={() => { setSubmitAsStatus(s.value); setShowStatusDropdown(false) }}
                          className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[#F4F6FB] transition-colors ${submitAsStatus === s.value ? 'font-semibold text-[#1E2A3B]' : 'text-[#4A5568]'}`}
                        >
                          <span className={`w-3 h-3 rounded-sm flex-shrink-0 ${s.dot}`} />
                          {s.label}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {!canReply && (
            <div className="border-t border-[#E5E9F2] bg-[#F4F6FB] px-5 py-3 text-xs text-[#9BAABB] text-center flex-shrink-0">
              {ticket?.status === 'resolved'
                ? 'This ticket is resolved. Reopen it in Zendesk to add more replies.'
                : 'You have view-only access to this ticket.'}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
