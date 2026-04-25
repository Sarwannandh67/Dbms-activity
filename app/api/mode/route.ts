import { NextRequest, NextResponse } from 'next/server'
import { getSupabase } from '@/lib/supabase'

export async function POST(req: NextRequest) {
  const { mode } = await req.json()
  if (mode !== 'buggy' && mode !== 'locked') {
    return NextResponse.json({ error: 'Invalid mode' }, { status: 400 })
  }

  const { error } = await getSupabase()
    .from('ipl_tickets')
    .update({ mode })
    .eq('id', 1)

  if (error) return NextResponse.json({ error: 'Update failed' }, { status: 500 })

  return NextResponse.json({ success: true, mode })
}
