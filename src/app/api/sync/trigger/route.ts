import { NextResponse } from 'next/server'

// Internal route called by the UI — injects the service role key server-side
export async function POST() {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? ''

  const res = await fetch(`${baseUrl}/api/sync/zendesk`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,
    },
  })

  const json = await res.json()
  return NextResponse.json(json, { status: res.status })
}
