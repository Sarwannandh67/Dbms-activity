import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { revealed } = await req.json()
  const { error } = await getSupabase()
    .from('ipl_tickets')
    .update({ qr_revealed: revealed })
    .eq('id', 1)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true, qr_revealed: revealed })
}
