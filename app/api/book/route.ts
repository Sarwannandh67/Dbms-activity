import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

// BUGGY route — intentional race condition for classroom demo
// The 1500ms delay is the race window: multiple requests read the same count before anyone writes
export async function POST(req: NextRequest) {
  const { name } = await req.json()
  if (!name) return NextResponse.json({ error: 'Name required' }, { status: 400 })

  const sb = getSupabase()

  // Step 1: Read current count
  const { data: ticket, error } = await sb
    .from('ipl_tickets')
    .select('count')
    .eq('id', 1)
    .single()

  if (error || !ticket) {
    return NextResponse.json({ error: 'DB error' }, { status: 500 })
  }

  const snapshot = ticket.count

  // Step 2: Artificial delay — this is the race window
  // All concurrent requests have now read the same `snapshot` value
  await new Promise((resolve) => setTimeout(resolve, 1500))

  // Step 3: Decide based on stale snapshot (no re-check, no lock)
  if (snapshot > 0) {
    await sb
      .from('ipl_tickets')
      .update({ count: snapshot - 1 })
      .eq('id', 1)

    await sb.from('ipl_bookings').insert({
      user_name: name,
      status: 'success',
      snapshot_count: snapshot,
      final_count: snapshot - 1,
    })

    return NextResponse.json({
      success: true,
      message: `Ticket booked! (DB had ${snapshot}, now ${snapshot - 1})`,
      remaining: snapshot - 1,
      snapshot,
    })
  } else {
    await sb.from('ipl_bookings').insert({
      user_name: name,
      status: 'failed',
      snapshot_count: snapshot,
      final_count: snapshot,
    })

    return NextResponse.json({
      success: false,
      message: 'Sorry! No tickets available.',
      remaining: 0,
      snapshot,
    })
  }
}
