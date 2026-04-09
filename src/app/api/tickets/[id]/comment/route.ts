import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { postTicketComment } from '@/lib/zendesk/api'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabaseUser = await createClient()
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('user_profiles')
    .select('role')
    .eq('user_id', user.id)
    .single()

  // Clients cannot post comments
  if (profile?.role === 'client') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { body, isPublic } = await req.json()
  if (!body?.trim()) return NextResponse.json({ error: 'Comment cannot be empty' }, { status: 400 })

  try {
    await postTicketComment(Number(id), body.trim(), isPublic ?? true)
    return NextResponse.json({ ok: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to post comment'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
