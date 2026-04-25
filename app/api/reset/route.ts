import { NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function POST() {
  const sb = getSupabase()
  const [ticketRes, bookingsRes] = await Promise.all([
    sb.from('ipl_tickets').update({ count: 15 }).eq('id', 1),
    sb.from('ipl_bookings').delete().neq('id', '00000000-0000-0000-0000-000000000000'),
  ])

  if (ticketRes.error || bookingsRes.error) {
    return NextResponse.json({ error: 'Reset failed' }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
