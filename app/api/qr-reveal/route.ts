import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

const COLUMNS = ['qr_booking_revealed', 'qr_explain_revealed', 'qr_quiz_revealed'] as const

export async function POST(req: NextRequest) {
  const { index, revealed } = await req.json()
  if (index < 0 || index > 2) return NextResponse.json({ error: 'invalid index' }, { status: 400 })
  const { error } = await getSupabase()
    .from('ipl_tickets')
    .update({ [COLUMNS[index]]: revealed })
    .eq('id', 1)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
