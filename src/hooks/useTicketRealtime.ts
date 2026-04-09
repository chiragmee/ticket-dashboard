'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

type TicketRow = Record<string, unknown>

interface UseTicketRealtimeProps {
  onInsert?: (ticket: TicketRow) => void
  onUpdate?: (ticket: TicketRow) => void
}

export function useTicketRealtime({ onInsert, onUpdate }: UseTicketRealtimeProps = {}) {
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const supabase = createClient()

    const channel = supabase
      .channel('tickets-changes')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'tickets' },
        (payload) => {
          if (payload.eventType === 'INSERT' && onInsert) {
            onInsert(payload.new as TicketRow)
          }
          if (payload.eventType === 'UPDATE' && onUpdate) {
            onUpdate(payload.new as TicketRow)
          }
        }
      )
      .subscribe((status) => {
        setIsConnected(status === 'SUBSCRIBED')
      })

    return () => {
      supabase.removeChannel(channel)
    }
  }, [onInsert, onUpdate])

  return { isConnected }
}
